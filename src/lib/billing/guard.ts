import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

type PlanTier = "mini" | "standard" | "pro";
const RANK: Record<PlanTier, number> = { mini: 1, standard: 2, pro: 3 };

const DEFAULT_GRACE_DAYS = 14;

function graceDays(): number {
  const raw = process.env.BILLING_GRACE_DAYS ?? String(DEFAULT_GRACE_DAYS);
  const n = Math.max(0, Math.min(365, parseInt(raw, 10) || DEFAULT_GRACE_DAYS));
  return n;
}

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" as any });
}

function json(status: number, body: any, extraHeaders?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(extraHeaders ?? {}),
    },
  });
}

function isNavigation(req: Request) {
  const accept = req.headers.get("accept") ?? "";
  const mode = req.headers.get("sec-fetch-mode") ?? "";
  const dest = req.headers.get("sec-fetch-dest") ?? "";
  return accept.includes("text/html") || mode === "navigate" || dest === "document";
}

function redirectToBilling(req: Request, reason: "inactive" | "plan", action?: string | null) {
  const origin = new URL(req.url).origin;
  const billing = new URL("/admin/billing", origin);

  const ref = req.headers.get("referer");
  try {
    if (ref) {
      const r = new URL(ref);
      billing.searchParams.set("return", r.pathname + r.search);
    }
  } catch {}

  billing.searchParams.set("reason", reason);
  if (action) billing.searchParams.set("action", action);

  return new Response(null, { status: 303, headers: { Location: billing.toString() } });
}

function redirectToPublic(pid: string, notice: string) {
  const dest = new URL(`/c/${pid}`, "https://example.invalid");
  dest.searchParams.set("notice", notice);
  // caller will replace origin
  return dest.pathname + dest.search;
}

function extractPublicIdFromUrl(req: Request): string | null {
  try {
    const u = new URL(req.url);
    return u.searchParams.get("public_id") ?? u.searchParams.get("publicId") ?? u.searchParams.get("pid");
  } catch {
    return null;
  }
}

async function extractTenantId(req: Request): Promise<string | null> {
  // Collect all candidate IDs from query string and body in one pass
  let tenantId: string | null = null;
  let certId: string | null = null;
  let publicId: string | null = null;

  // From query string
  try {
    const u = new URL(req.url);
    const q = u.searchParams;
    tenantId = q.get("tenant_id") ?? q.get("tenantId") ?? q.get("tenant") ?? null;
    if (tenantId) return tenantId;

    certId = q.get("certificate_id") ?? q.get("certificateId") ?? q.get("id") ?? null;
    publicId = q.get("public_id") ?? q.get("publicId") ?? q.get("pid") ?? null;
  } catch {}

  // From body (only if we still need to look)
  if (!certId && !publicId) {
    try {
      const b: any = await (req as any).clone().json();
      tenantId = b?.tenant_id ?? b?.tenantId ?? b?.tenant ?? null;
      if (typeof tenantId === "string" && tenantId) return tenantId;

      certId = b?.certificate_id ?? b?.certificateId ?? null;
      if (typeof certId !== "string") certId = null;

      publicId = b?.public_id ?? b?.publicId ?? b?.pid ?? null;
      if (typeof publicId !== "string") publicId = null;

      // certificate_ids array: use first element
      if (!certId) {
        const ids = b?.certificate_ids ?? b?.certificateIds ?? b?.ids ?? null;
        if (Array.isArray(ids) && ids.length > 0 && typeof ids[0] === "string") {
          certId = ids[0];
        }
      }
    } catch {}
  }

  // Single DB lookup (prioritize cert ID over public ID)
  if (!certId && !publicId) return null;

  try {
    const supabase = createAdminClient();
    if (certId) {
      const { data } = await supabase.from("certificates").select("tenant_id").eq("id", certId).limit(1).maybeSingle();
      if (data?.tenant_id) return data.tenant_id as string;
    }
    if (publicId) {
      const { data } = await supabase.from("certificates").select("tenant_id").eq("public_id", publicId).limit(1).maybeSingle();
      if (data?.tenant_id) return data.tenant_id as string;
    }
  } catch {}

  return null;
}

async function graceInfoForTenant(stripe_subscription_id: string | null) {
  if (!stripe_subscription_id) return { ok: false as const, grace_until: null as string | null };

  try {
    const stripe = getStripe();
    const res: any = await stripe.subscriptions.retrieve(stripe_subscription_id);
    const sub: any = res?.data ?? res;

    const end = sub?.current_period_end ? Number(sub.current_period_end) : null;
    if (!end) return { ok: false as const, grace_until: null as string | null };

    const until = new Date((end + graceDays() * 86400) * 1000);
    return { ok: true as const, grace_until: until.toISOString(), period_end_unix: end as number };
  } catch {
    return { ok: false as const, grace_until: null as string | null };
  }
}

export async function enforceBilling(
  req: Request,
  opts: { minPlan: PlanTier; action?: string } = { minPlan: "mini" }
): Promise<Response | null> {
  const tenant_id = await extractTenantId(req);
  const action = opts.action ?? null;

  if (!tenant_id) {
    return json(400, { error: "Missing tenant_id (billing guard)" }, { "x-billing-url": "/admin/billing" });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("plan_tier, is_active, stripe_subscription_id")
    .eq("id", tenant_id)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return json(404, { error: "Tenant not found (billing guard)" }, { "x-billing-url": "/admin/billing" });
  }

  const plan = (data.plan_tier ?? "mini") as PlanTier;
  const active = !!data.is_active;

  // ---- inactive handling with grace for public_pdf ----
  if (!active) {
    // public_pdf は「猶予期間中だけ許可」
    if (action === "public_pdf") {
      const g = await graceInfoForTenant((data as any).stripe_subscription_id ?? null);
      const now = Date.now();

      if (g.ok && g.grace_until) {
        const untilMs = Date.parse(g.grace_until);
        if (Number.isFinite(untilMs) && now < untilMs) {
          // 猶予中：許可（ただし公開ページ側で“検証不可”は出る）
          return null;
        }

        // 猶予切れ：公開ページへ戻して理由表示（public_id が取れる時だけ）
        const pid = extractPublicIdFromUrl(req);
        if (pid && isNavigation(req)) {
          const origin = new URL(req.url).origin;
          const loc = origin + redirectToPublic(pid, "pdf_blocked");
          return new Response(null, { status: 303, headers: { Location: loc } });
        }

        return json(
          402,
          {
            error: "Billing inactive",
            message: "支払い停止中のため、PDF出力は利用できません。",
            billing_url: "/admin/billing",
            action,
            grace_until: g.grace_until,
          },
          { "x-billing-url": "/admin/billing" }
        );
      }

      // grace情報が取れない場合はブロック（安全側）
      const pid = extractPublicIdFromUrl(req);
      if (pid && isNavigation(req)) {
        const origin = new URL(req.url).origin;
        const loc = origin + redirectToPublic(pid, "pdf_blocked");
        return new Response(null, { status: 303, headers: { Location: loc } });
      }

      return json(
        402,
        {
          error: "Billing inactive",
          message: "支払い停止中のため、PDF出力は利用できません。",
          billing_url: "/admin/billing",
          action,
        },
        { "x-billing-url": "/admin/billing" }
      );
    }

    // admin 系は即ブロック（猶予は公開PDFだけ）
    if (isNavigation(req)) return redirectToBilling(req, "inactive", action);
    return json(
      402,
      {
        error: "Billing inactive",
        message: "支払いが停止しています。請求・プラン画面から支払いを再開してください。",
        billing_url: "/admin/billing",
        action,
      },
      { "x-billing-url": "/admin/billing" }
    );
  }

  // ---- plan restriction ----
  if (RANK[plan] < RANK[opts.minPlan]) {
    if (isNavigation(req)) return redirectToBilling(req, "plan", action);
    return json(
      403,
      {
        error: "Plan restricted",
        message: `この機能は ${opts.minPlan} 以上で利用できます。`,
        billing_url: "/admin/billing",
        action,
        current_plan: plan,
      },
      { "x-billing-url": "/admin/billing" }
    );
  }

  return null;
}
