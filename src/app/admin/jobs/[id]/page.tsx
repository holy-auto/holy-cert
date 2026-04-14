import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import PageHeader from "@/components/ui/PageHeader";
import JobWorkflowClient from "./JobWorkflowClient";

/**
 * 案件ワークフロー (Job Workflow) 画面
 * ------------------------------------------------------------
 * 予約 (reservation) を「案件 (Job)」と捉え、
 *   予約 → チェックイン → 作業 → 写真 → 証明書 → 請求 → 決済
 * の業務フローを 1 画面に集約する統合ワークスペース。
 *
 * 既存機能を横断的に束ね、画面遷移を挟まずに次のアクションへ
 * 進めるよう設計。ハブ画面 (`/admin/trades`, `/admin/agent-hub`) が
 * 入口をまとめたのに対し、本画面は「1 件の案件」に閉じて
 * 業務の流れそのものを具現化する。
 */

async function getMyTenantId(supabase: any) {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return null;
  const { data, error } = await supabase
    .from("tenant_memberships")
    .select("tenant_id")
    .limit(1)
    .single();
  if (error || !data) return null;
  return data.tenant_id as string;
}

export default async function JobWorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect(`/login?next=/admin/jobs/${id}`);

  const tenantId = await getMyTenantId(supabase);
  if (!tenantId) {
    return (
      <div className="space-y-6">
        <PageHeader tag="JOB" title="案件ワークフロー" />
        <div className="glass-card p-4 text-sm text-danger">
          テナントが見つかりません。
        </div>
      </div>
    );
  }

  // 予約 (案件本体)
  const { data: reservation, error: resErr } = await supabase
    .from("reservations")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (resErr || !reservation) {
    return (
      <div className="space-y-6">
        <PageHeader
          tag="JOB"
          title="案件ワークフロー"
          actions={
            <Link href="/admin/reservations" className="btn-secondary">
              予約一覧へ
            </Link>
          }
        />
        <div className="glass-card p-4 text-sm text-danger">
          指定された案件 (予約) が見つかりません。
        </div>
      </div>
    );
  }

  // 顧客
  const { data: customer } = reservation.customer_id
    ? await supabase
        .from("customers")
        .select("id, name, email, phone, company_name")
        .eq("id", reservation.customer_id)
        .eq("tenant_id", tenantId)
        .single()
    : { data: null };

  // 車両
  const { data: vehicle } = reservation.vehicle_id
    ? await supabase
        .from("vehicles")
        .select("id, maker, model, year, plate_display, vin")
        .eq("id", reservation.vehicle_id)
        .eq("tenant_id", tenantId)
        .single()
    : { data: null };

  // 紐付く証明書 (vehicle_id または customer_id で引当て)
  let certificates: any[] = [];
  if (reservation.vehicle_id) {
    const { data } = await supabase
      .from("certificates")
      .select("public_id, status, created_at, service_price, customer_name")
      .eq("tenant_id", tenantId)
      .eq("vehicle_id", reservation.vehicle_id)
      .order("created_at", { ascending: false });
    certificates = data ?? [];
  } else if (reservation.customer_id) {
    const { data } = await supabase
      .from("certificates")
      .select("public_id, status, created_at, service_price, customer_name")
      .eq("tenant_id", tenantId)
      .eq("customer_id", reservation.customer_id)
      .order("created_at", { ascending: false });
    certificates = data ?? [];
  }

  // 紐付く請求・見積書 (customer_id ベース)
  let documents: any[] = [];
  if (reservation.customer_id) {
    const { data } = await supabase
      .from("documents")
      .select("id, doc_number, doc_type, status, total, issued_at, due_date")
      .eq("tenant_id", tenantId)
      .eq("customer_id", reservation.customer_id)
      .in("doc_type", [
        "invoice",
        "consolidated_invoice",
        "estimate",
        "receipt",
        "delivery",
      ])
      .order("created_at", { ascending: false });
    documents = data ?? [];
  }

  return (
    <main className="space-y-6">
      <PageHeader
        tag="JOB"
        title={`案件: ${reservation.title ?? "(無題)"}`}
        description="予約→作業→証明書→請求→決済 を 1 画面で進行管理します"
        actions={
          <Link href="/admin/reservations" className="btn-secondary">
            予約一覧へ
          </Link>
        }
      />

      <JobWorkflowClient
        reservation={reservation}
        customer={customer}
        vehicle={vehicle}
        certificates={certificates}
        documents={documents}
      />
    </main>
  );
}
