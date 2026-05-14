import { redirect } from "next/navigation";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveManufacturerCaller } from "@/lib/auth/manufacturerCaller";
import PageHeader from "@/components/ui/PageHeader";
import TemplatesClient from "./TemplatesClient";

export const dynamic = "force-dynamic";

export default async function ManufacturerTemplatesPage() {
  const supabase = await createSupabaseServerClient();
  const caller = await resolveManufacturerCaller(supabase);
  if (!caller) redirect("/manufacturer/login");

  return (
    <div className="space-y-6">
      <PageHeader
        tag="DESIGN TEMPLATES"
        title="デザインテンプレート"
        description="自社で運用中のメーカー指定デザイン一覧です。内容の変更は Ledra 運営にご依頼ください。"
      />
      <TemplatesClient />
    </div>
  );
}
