import { redirect } from "next/navigation";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveManufacturerCaller } from "@/lib/auth/manufacturerCaller";
import PageHeader from "@/components/ui/PageHeader";
import QualityClient from "./QualityClient";

export const dynamic = "force-dynamic";

export default async function ManufacturerQualityPage() {
  const supabase = await createSupabaseServerClient();
  const caller = await resolveManufacturerCaller(supabase);
  if (!caller) redirect("/manufacturer/login");

  return (
    <div className="space-y-6">
      <PageHeader
        tag="QUALITY"
        title="品質チェック"
        description="自社デザインで発行された証明書のうち、施工写真・保証情報・施工内容などが欠けているものを検出します。施工店への指導や認定見直しの材料にご利用ください。"
      />
      <QualityClient />
    </div>
  );
}
