import { redirect } from "next/navigation";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveManufacturerCaller } from "@/lib/auth/manufacturerCaller";
import PageHeader from "@/components/ui/PageHeader";
import TenantsClient from "./TenantsClient";

export const dynamic = "force-dynamic";

export default async function ManufacturerTenantsPage() {
  const supabase = await createSupabaseServerClient();
  const caller = await resolveManufacturerCaller(supabase);
  if (!caller) redirect("/manufacturer/login");

  return (
    <div className="space-y-6">
      <PageHeader
        tag="CERTIFIED INSTALLERS"
        title="認定施工店"
        description="自社が認定している施工店と、各店舗が発行した証明書の件数を確認できます。"
      />
      <TenantsClient />
    </div>
  );
}
