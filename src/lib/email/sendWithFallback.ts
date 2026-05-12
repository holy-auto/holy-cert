/**
 * Email send with multi-layer reliability:
 *
 *   1. Inline retry (Resend SDK already does 3 retries on 429/5xx)
 *   2. On terminal failure, enqueue an outbox `email.send` event
 *      → cron/outbox-flush retries up to 8 times with exponential backoff
 *      → max ~13h retry window before dead_letter
 *   3. Future: outbox dispatcher can try SES as a secondary provider
 *      when Resend stays down. The dispatcher contract already allows
 *      that without further callsite changes.
 *
 * Returns `{ ok: true, mode: "sent" | "queued" }` to callers. "sent" =
 * Resend accepted now; "queued" = we lost Resend but the message is
 * durably stored and will be retried. Callers should treat both as a
 * success and SHOULD NOT block the user.
 *
 * Roadmap: docs/architecture-roadmap.md §3 メール障害対策
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { sendResendEmail, type ResendMessage, type ResendSendResult, isResendFailure } from "./resendSend";
import { enqueueOutboxEvent } from "@/lib/outbox";

export interface EmailQueueContext {
  /** outbox tenant_id for the row. Required (every email belongs to a scope). */
  tenantId: string;
  /**
   * Service-role admin client (tenant-scoped or full). Only used to
   * enqueue the outbox row, never to fetch tenant data; cross-tenant
   * leakage is impossible because outbox enqueue does not run any SELECT.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  outboxAdmin: SupabaseClient<any, any, any>;
}

export type EmailSendOutcome =
  | { ok: true; mode: "sent"; id: string | null }
  | { ok: true; mode: "queued"; outboxId: string }
  | { ok: false; status: number | null; error: string };

/**
 * Resend payload kept JSON-safe for the outbox row. Mirrors ResendMessage
 * but with `Record<string, unknown>` so we can satisfy the outbox payload
 * type without weakening the call signature.
 */
function serializeMessage(msg: ResendMessage): Record<string, unknown> {
  return {
    from: msg.from ?? null,
    to: msg.to,
    subject: msg.subject,
    html: msg.html ?? null,
    text: msg.text ?? null,
    reply_to: msg.reply_to ?? null,
    attachments: msg.attachments ?? null,
    idempotency_key: msg.idempotencyKey ?? null,
  };
}

/**
 * Send an email with inline retry → outbox fallback.
 *
 * `result.mode` distinguishes the two success paths so observability
 * dashboards can chart how often we fall back to async delivery.
 */
export async function sendEmailWithFallback(msg: ResendMessage, ctx: EmailQueueContext): Promise<EmailSendOutcome> {
  // 1) Inline retry via Resend SDK.
  const direct: ResendSendResult = await sendResendEmail(msg);
  if (!isResendFailure(direct)) {
    return { ok: true, mode: "sent", id: direct.id };
  }

  // 2) Permanent 4xx (other than 429) — do NOT enqueue. The mail will
  //    fail the same way on every retry; surface the error to the caller.
  if (direct.status !== null && direct.status >= 400 && direct.status < 500 && direct.status !== 429) {
    logger.warn("email send: permanent Resend failure — not queueing", {
      status: direct.status,
      to: Array.isArray(msg.to) ? msg.to.length : 1,
    });
    return { ok: false, status: direct.status, error: direct.error };
  }

  // 3) Transient / unknown failure — enqueue for cron retry.
  const enq = await enqueueOutboxEvent(ctx.outboxAdmin, {
    tenantId: ctx.tenantId,
    topic: "email.send",
    aggregateId: msg.idempotencyKey ?? null,
    payload: {
      message: serializeMessage(msg),
      initialError: { status: direct.status, error: direct.error.slice(0, 500) },
    },
  });

  if (!enq.ok) {
    logger.error("email send: BOTH inline AND outbox enqueue failed", {
      resendStatus: direct.status,
      outboxError: enq.error,
    });
    return { ok: false, status: direct.status, error: `inline+queue both failed: ${enq.error}` };
  }

  logger.info("email send: queued for async retry after inline failure", {
    outboxId: enq.id,
    resendStatus: direct.status,
  });
  return { ok: true, mode: "queued", outboxId: enq.id };
}

/**
 * Outbox dispatcher for the `email.send` topic.
 *
 * Reads the serialized ResendMessage back from the row payload and calls
 * `sendResendEmail` (which itself retries 3 times inline). The outbox
 * framework handles exponential backoff between attempts and dead-letters
 * after maxAttempts (currently 8).
 *
 * SES fallback hook (TODO): when `RESEND_FALLBACK_PROVIDER=ses` and the
 * Resend call returns 5xx, attempt SES via @aws-sdk/client-sesv2 before
 * returning {ok:false}. Stub for now — fallback to SES is gated by
 * environment availability.
 */
export function buildEmailDispatcher() {
  return async (row: {
    id: string;
    payload: Record<string, unknown>;
  }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const payload = row.payload as {
      message?: Record<string, unknown>;
    };
    const m = payload.message;
    if (!m || typeof m !== "object") {
      return { ok: false, error: "malformed payload (missing message)" };
    }

    const msg: ResendMessage = {
      from: typeof m.from === "string" ? m.from : undefined,
      to: m.to as ResendMessage["to"],
      subject: String(m.subject ?? ""),
      html: typeof m.html === "string" ? m.html : undefined,
      text: typeof m.text === "string" ? m.text : undefined,
      reply_to: (m.reply_to as ResendMessage["reply_to"]) ?? undefined,
      attachments: (m.attachments as ResendMessage["attachments"]) ?? undefined,
      idempotencyKey: typeof m.idempotency_key === "string" ? m.idempotency_key : undefined,
    };

    const result = await sendResendEmail(msg);
    if (!isResendFailure(result)) return { ok: true };

    // Permanent 4xx → mark delivered to drop the row (Resend will never accept it).
    if (result.status !== null && result.status >= 400 && result.status < 500 && result.status !== 429) {
      logger.warn("email dispatcher: permanent Resend failure, dropping row", {
        outboxId: row.id,
        status: result.status,
      });
      // Treating as ok:true so outbox-flush marks it delivered. The downside
      // of bouncing into dead_letter on a permanent failure is alert noise;
      // the row's error is already logged here for forensic purposes.
      return { ok: true };
    }

    return { ok: false, error: `${result.status ?? "?"}: ${result.error.slice(0, 200)}` };
  };
}
