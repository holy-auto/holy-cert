import { redirect } from "next/navigation";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCallerWithRole } from "@/lib/auth/checkRole";
import { isPlatformAdmin } from "@/lib/auth/platformAdmin";
import PageHeader from "@/components/ui/PageHeader";
import VehicleReportSettingsClient from "./VehicleReportSettingsClient";

export const dynamic = "force-dynamic";

export default async function PlatformVehicleReportPage() {
  const supabase = await createSupabaseServerClient();
  const caller = await resolveCallerWithRole(supabase);

  if (!caller) redirect("/login?next=/admin/platform/vehicle-report");
  if (!isPlatformAdmin(caller)) redirect("/admin");

  return (
    <div className="space-y-6">
      <PageHeader
        tag="運営専用"
        title="車両履歴レポート価格"
        description="買取店など第三者が /v/[vin] の全履歴レポートを閲覧する際の都度課金価格を設定します。パスポート履歴はテナント横断のため、価格はプラットフォーム共通です。"
      />
      <VehicleReportSettingsClient />
    </div>
  );
}
