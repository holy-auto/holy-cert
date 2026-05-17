import { redirect } from "next/navigation";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveManufacturerCaller } from "@/lib/auth/manufacturerCaller";
import PageHeader from "@/components/ui/PageHeader";
import AuditClient from "./AuditClient";

export const dynamic = "force-dynamic";

export default async function ManufacturerAuditPage() {
  const supabase = await createSupabaseServerClient();
  const caller = await resolveManufacturerCaller(supabase);
  if (!caller) redirect("/manufacturer/login");

  return (
    <div className="space-y-6">
      <PageHeader
        tag="AUDIT LOG"
        title="操作ログ"
        description="認定の付与・解除がいつ・誰によって行われたかの履歴です。メーカー担当者の操作と Ledra 運営の操作を区別して表示します。"
      />
      <AuditClient />
    </div>
  );
}
