/**
 * POST /api/webhooks/video/[provider]
 *
 * Provider 共通の webhook 受信エンドポイント。`[provider]` セグメントで
 * Cloudflare Stream / Mux を切り替える (将来 Mux に切り替えても route 増設不要)。
 *
 * 責務:
 *   1. raw body を取得 (signature 検証のため再 stringify NG)
 *   2. provider.parseWebhook() で署名検証 + イベント正規化
 *   3. asset_id を持つ academy_lessons 行を更新
 *   4. 200 を返す (provider が再送しない)
 *
 * 重要: 署名検証失敗時は 401 を返し、verify 前の rawBody を logger に
 * 載せない (リプレイ攻撃時の調査ノイズ削減)。
 */

import { NextRequest } from "next/server";
import { apiInternalError } from "@/lib/api/response";
import { getProvider } from "@/lib/video/provider";
import type { VideoProviderName } from "@/lib/video/types";
import { createServiceRoleAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_PROVIDERS: VideoProviderName[] = ["cloudflare", "mux"];

function isValidProvider(p: string): p is VideoProviderName {
  return (VALID_PROVIDERS as string[]).includes(p);
}

function lowerHeaders(req: NextRequest): Record<string, string> {
  const out: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    out[k.toLowerCase()] = v;
  });
  return out;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  try {
    const { provider: providerSlug } = await ctx.params;
    if (!isValidProvider(providerSlug)) {
      return new Response(JSON.stringify({ error: "unknown_provider" }), { status: 404 });
    }

    const provider = getProvider(providerSlug);
    const rawBody = await req.text();
    const headers = lowerHeaders(req);

    const parsed = await provider.parseWebhook({ rawBody, headers });
    if (!parsed.ok) {
      // 401 for signature/format errors; 200 only on verified events.
      return new Response(JSON.stringify({ error: parsed.error }), { status: 401 });
    }

    const event = parsed.data;
    if (event.type === "ignored") {
      return new Response(JSON.stringify({ ok: true, ignored: true }), { status: 200 });
    }

    const admin = createServiceRoleAdmin(
      `video webhook (${provider.name}) — locates lesson by (video_provider, video_asset_id) across tenants`,
    );

    const baseUpdate: Record<string, unknown> = {
      video_status: event.type === "asset.ready" ? "ready" : event.type === "asset.errored" ? "errored" : "pending",
      updated_at: new Date().toISOString(),
    };
    if (event.duration_sec !== undefined) {
      baseUpdate.video_duration_sec = event.duration_sec;
    }
    if (event.metadata) {
      baseUpdate.video_provider_metadata = event.metadata;
    }

    const { error, count } = await admin
      .from("academy_lessons")
      .update(baseUpdate, { count: "exact" })
      .eq("video_provider", provider.name)
      .eq("video_asset_id", event.asset_id);

    if (error) {
      logger.error("video webhook update failed", { provider: provider.name, assetId: event.asset_id, error });
      return apiInternalError(error, `video webhook ${provider.name}`);
    }

    if (!count) {
      // Asset may have been deleted on our side or webhook arrived before
      // upload-url persisted the lesson row. 200 keeps provider from
      // retrying — we can reconcile via getAsset() later.
      logger.warn("video webhook for unknown asset", { provider: provider.name, assetId: event.asset_id });
    }

    return new Response(JSON.stringify({ ok: true, type: event.type, matched: count ?? 0 }), { status: 200 });
  } catch (e: unknown) {
    return apiInternalError(e, "video webhook");
  }
}
