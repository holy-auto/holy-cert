import { redirect } from "next/navigation";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveManufacturerCaller } from "@/lib/auth/manufacturerCaller";
import PageHeader from "@/components/ui/PageHeader";
import CertificatesClient from "./CertificatesClient";

export const dynamic = "force-dynamic";

export default async function ManufacturerCertificatesPage() {
  const supabase = await createSupabaseServerClient();
  const caller = await resolveManufacturerCaller(supabase);
  if (!caller) redirect("/manufacturer/login");

  return (
    <div className="space-y-6">
      <PageHeader
        tag="CERTIFICATES"
        title="発行履歴"
        description="自社デザインで発行された施工証明書の全件を確認できます。施工店・テンプレート・サービス種別で絞り込み可能です。"
      />
      <CertificatesClient />
    </div>
  );
}
