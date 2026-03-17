import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import PageHeader from "@/components/ui/PageHeader";
import OperatorTicketsClient from "./OperatorTicketsClient";

export const dynamic = "force-dynamic";

export default async function OperatorSupportPage() {
  const admin = createSupabaseAdminClient();

  const { data: tickets } = await admin
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false });

  // Fetch tenant names for display
  const tenantIds = [...new Set((tickets ?? []).map((t: any) => t.tenant_id))];
  const { data: tenants } = await admin
    .from("tenants")
    .select("id,name")
    .in("id", tenantIds.length > 0 ? tenantIds : ["__none__"]);

  const tenantMap: Record<string, string> = {};
  for (const t of tenants ?? []) {
    tenantMap[t.id] = (t.name as string) ?? "不明";
  }

  const enriched = (tickets ?? []).map((t: any) => ({
    ...t,
    tenant_name: tenantMap[t.tenant_id] ?? "不明",
  }));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader
        tag="運営"
        title="サポート対応"
        description="テナントからのサポート問い合わせに対応します。"
      />
      <OperatorTicketsClient initialTickets={enriched} />
    </div>
  );
}
