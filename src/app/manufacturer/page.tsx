import { redirect } from "next/navigation";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveManufacturerCaller } from "@/lib/auth/manufacturerCaller";
import { createServiceRoleAdmin } from "@/lib/supabase/admin";
import PageHeader from "@/components/ui/PageHeader";
import ManufacturerDashboardClient from "./ManufacturerDashboardClient";

export const dynamic = "force-dynamic";

export default async function ManufacturerDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const caller = await resolveManufacturerCaller(supabase);
  if (!caller) redirect("/manufacturer/login");

  // Render minimal SSR shell with the manufacturer name so the page
  // isn't blank during the initial client fetch. The heavy aggregations
  // happen inside the dashboard client which polls the dashboard API.
  const admin = createServiceRoleAdmin("manufacturer dashboard SSR — name only, full data fetched client-side");
  const { data: mfr } = await admin.from("manufacturers").select("name").eq("id", caller.manufacturerId).maybeSingle();

  return (
    <div className="space-y-6">
      <PageHeader
        tag="MANUFACTURER"
        title={mfr?.name ? `${mfr.name} ダッシュボード` : "ダッシュボード"}
        description="認定施工店ネットワークの稼働状況と、メーカー指定デザインで発行された証明書の集計を確認できます。"
      />
      <ManufacturerDashboardClient />
    </div>
  );
}
