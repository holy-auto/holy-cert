import type { ReactElement } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createTenantScopedAdmin } from "@/lib/supabase/admin";
import { isAddonEnabled, type AddonKey } from "./addons";

/**
 * Server-side add-on gate for /admin/* pages.
 *
 * Pattern (used by /admin/market-vehicles, /admin/btob, /admin/orders,
 * /admin/deals — see `docs/ledra-goals-strategy-2026-05.md` §6):
 *
 *   ```tsx
 *   export default async function MyAddonPage() {
 *     const gate = await requireAddonOrGateView("market_vehicles", {
 *       feature: "中古車マーケット",
 *       href: "/admin/market-vehicles",
 *     });
 *     if (gate) return gate;
 *     // …addon-enabled content
 *   }
 *   ```
 *
 * If the tenant has the add-on enabled → returns `null` and the caller
 * proceeds. If not → returns a JSX block that explains the gate and how
 * to enable it; the caller renders that instead. Non-logged-in callers
 * are redirected to `/login?next=…` upstream.
 *
 * Why JSX instead of a hard 4xx? Showing an inline "this is a paid add-on"
 * card lets the tenant see the feature exists and request enablement,
 * which is much better UX than a bare 402 JSON. The actual HTTP status
 * is still 200 — Next.js doesn't have a clean way to return 402 from a
 * server component without rewriting the response, and downstream BizDev
 * wants to track the funnel from view → enable request.
 */
type GateCopy = { feature: string; href: string };

export async function requireAddonOrGateView(addonKey: AddonKey, copy: GateCopy): Promise<ReactElement | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(copy.href)}`);
  }

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership?.tenant_id) {
    // No tenant context — bail to login (membership rebuild) rather than
    // showing the gate, which would imply they "could" enable it.
    redirect(`/login?next=${encodeURIComponent(copy.href)}`);
  }

  const { admin } = createTenantScopedAdmin(membership.tenant_id);
  const enabled = await isAddonEnabled(admin, membership.tenant_id, addonKey);
  if (enabled) return null;

  return <AddonGateView feature={copy.feature} />;
}

function AddonGateView({ feature }: { feature: string }) {
  return (
    <div className="mx-auto max-w-[640px] p-6">
      <div className="glass-card space-y-4 p-6">
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted">アドオン機能</div>
          <h1 className="text-xl font-bold text-primary">{feature} は別途契約が必要です</h1>
        </div>
        <p className="text-sm leading-relaxed text-secondary">
          この機能は {feature} アドオンで提供されています。標準プランには含まれていません。
          利用ご希望の場合は、契約担当者へお問い合わせください。
        </p>
        <div className="rounded-xl border border-border-default bg-base p-4 text-xs text-muted">
          <div className="font-semibold text-primary">参考</div>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            <li>2026-05 経営判断によりマーケット系機能はアドオン化されています</li>
            <li>既に他店舗で利用中のテナントは自動的にアドオンが付与済みです</li>
            <li>有効化には platform admin による設定が必要です</li>
          </ul>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin" className="btn-secondary text-sm">
            ダッシュボードに戻る
          </Link>
          <a
            href="mailto:support@holy-auto.com?subject=%E3%82%A2%E3%83%89%E3%82%AA%E3%83%B3%E5%88%A9%E7%94%A8%E7%94%B3%E8%AB%8B"
            className="btn-primary text-sm"
          >
            アドオンを申請する
          </a>
        </div>
      </div>
    </div>
  );
}
