import { createClient } from "@supabase/supabase-js";

type PlanTier = "mini" | "standard" | "pro";
const RANK: Record<PlanTier, number> = { mini: 1, standard: 2, pro: 3 };

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
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

function redirectToBilling(req: Request, reason: "inactive" | "plan") {
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

  return new Response(null, {
    status: 303,
    headers: { Location: billing.toString() },
  });
}

async function extractTenantId(req: Request): Promise<string | null> {
  // query
  try {
    const u = new URL(req.url);
    const q = u.searchParams;
    const tid = q.get("tenant_id") ?? q.get("tenantId") ?? q.get("tenant") ?? null;
    if (tid) return tid;
  } catch {}

  // body (clone)
  try {
    const b: any = await (req as any).clone().json();

    const tid = b?.tenant_id ?? b?.tenantId ?? b?.tenant ?? null;
    if (typeof tid === "string" && tid) return tid;

    const cid = b?.certificate_id ?? b?.certificateId ?? null;
    if (typeof cid === "string" && cid) {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("certificates")
        .select("tenant_id")
        .eq("id", cid)
        .limit(1)
        .maybeSingle();
      if (!error && data?.tenant_id) return data.tenant_id as string;
    }

    const ids = b?.certificate_ids ?? b?.certificateIds ?? b?.ids ?? null;
    if (Array.isArray(ids) && ids.length > 0 && typeof ids[0] === "string") {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("certificates")
        .select("tenant_id")
        .eq("id", ids[0])
        .limit(1)
        .maybeSingle();
      if (!error && data?.tenant_id) return data.tenant_id as string;
    }
  } catch {}

  return null;
}

export async function enforceBilling(
  req: Request,
  opts: { minPlan: PlanTier; action?: string } = { minPlan: "mini" }
): Promise<Response | null> {
  const tenant_id = await extractTenantId(req);
  if (!tenant_id) {
    return json(400, { error: "Missing tenant_id (billing guard)" }, { "x-billing-url": "/admin/billing" });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tenants")
    .select("plan_tier, is_active")
    .eq("id", tenant_id)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return json(404, { error: "Tenant not found (billing guard)" }, { "x-billing-url": "/admin/billing" });
  }

  const plan = (data.plan_tier ?? "mini") as PlanTier;
  const active = !!data.is_active;

  if (!active) {
    if (isNavigation(req)) return redirectToBilling(req, "inactive");
    return json(
      402,
      {
        error: "Billing inactive",
        message: "支払いが停止しています。請求・プラン画面から支払いを再開してください。",
        billing_url: "/admin/billing",
        action: opts.action ?? null,
      },
      { "x-billing-url": "/admin/billing" }
    );
  }

  if (RANK[plan] < RANK[opts.minPlan]) {
    if (isNavigation(req)) return redirectToBilling(req, "plan");
    return json(
      403,
      {
        error: "Plan restricted",
        message: `この機能は ${opts.minPlan} 以上で利用できます。`,
        billing_url: "/admin/billing",
        action: opts.action ?? null,
        current_plan: plan,
      },
      { "x-billing-url": "/admin/billing" }
    );
  }

  return null;
}
