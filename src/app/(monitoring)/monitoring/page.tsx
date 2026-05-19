import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCallerWithRole } from "@/lib/auth/checkRole";
import { isPlatformAdmin } from "@/lib/auth/platformAdmin";
import MonitoringDashboardClient from "./MonitoringDashboardClient";

export const dynamic = "force-dynamic";

export default async function MonitoringPage() {
  const supabase = await createSupabaseServerClient();
  const caller = await resolveCallerWithRole(supabase);

  // Independent site, but NOT public: ops/error data is strictly 運営.
  if (!caller) redirect("/login?next=/monitoring");

  if (!isPlatformAdmin(caller)) {
    return (
      <div className="rounded-lg border border-border-default bg-surface p-8 text-center">
        <h1 className="text-lg font-semibold">アクセス権限がありません</h1>
        <p className="mt-2 text-sm text-secondary">監視センターは Ledra 運営（プラットフォーム管理者）専用です。</p>
        <Link href="/admin" className="btn-secondary mt-4 inline-flex">
          管理画面へ戻る
        </Link>
      </div>
    );
  }

  return <MonitoringDashboardClient />;
}
