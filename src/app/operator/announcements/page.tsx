import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import PageHeader from "@/components/ui/PageHeader";
import OperatorAnnouncementsClient from "./OperatorAnnouncementsClient";

export const dynamic = "force-dynamic";

export default async function OperatorAnnouncementsPage() {
  const admin = createSupabaseAdminClient();

  const { data: announcements } = await admin
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        tag="運営"
        title="お知らせ配信"
        description="全テナントに表示されるお知らせを管理します。"
      />
      <OperatorAnnouncementsClient initialAnnouncements={announcements ?? []} />
    </div>
  );
}
