import { redirect } from "next/navigation";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCallerWithRole } from "@/lib/auth/checkRole";
import { isPlatformAdmin } from "@/lib/auth/platformAdmin";
import PageHeader from "@/components/ui/PageHeader";
import ManufacturersClient from "./ManufacturersClient";

export const dynamic = "force-dynamic";

export default async function PlatformManufacturersPage() {
  const supabase = await createSupabaseServerClient();
  const caller = await resolveCallerWithRole(supabase);

  if (!caller) redirect("/login?next=/admin/platform/manufacturers");
  if (!isPlatformAdmin(caller)) redirect("/admin");

  return (
    <div className="space-y-6">
      <PageHeader
        tag="運営専用"
        title="メーカー認定管理"
        description="認定施工店ネットワークを構築するメーカー、メーカー指定デザイン、認定済みテナントを一元管理します。"
      />
      <ManufacturersClient />
    </div>
  );
}
