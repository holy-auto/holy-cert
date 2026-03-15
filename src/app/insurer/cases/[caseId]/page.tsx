"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CaseStatusBadge } from "@/components/StatusBadge";
import { formatDateTime } from "@/lib/format";
import type { InsuranceCaseDetail, InsuranceCaseStatus } from "@/types/insurer";

const CASE_TYPE_LABELS: Record<string, string> = {
  accident: "事故入庫",
  vehicle_insurance: "車両保険",
  rework_check: "再施工確認",
  damage_check: "損傷確認",
  other: "その他",
};

// 保険会社が実行できるステータス遷移
const INSURER_TRANSITIONS: Record<string, { to: InsuranceCaseStatus; label: string; color: string }[]> = {
  submitted: [
    { to: "under_review", label: "確認を開始", color: "bg-purple-600 hover:bg-purple-700 text-white" },
  ],
  under_review: [
    { to: "info_requested", label: "追加情報を依頼", color: "bg-amber-500 hover:bg-amber-600 text-white" },
    { to: "approved", label: "承認", color: "bg-emerald-600 hover:bg-emerald-700 text-white" },
    { to: "rejected", label: "却下", color: "bg-red-600 hover:bg-red-700 text-white" },
  ],
  info_requested: [
    { to: "under_review", label: "確認を再開", color: "bg-purple-600 hover:bg-purple-700 text-white" },
  ],
  approved: [
    { to: "closed", label: "完了にする", color: "bg-neutral-600 hover:bg-neutral-700 text-white" },
  ],
  rejected: [
    { to: "closed", label: "完了にする", color: "bg-neutral-600 hover:bg-neutral-700 text-white" },
  ],
};

export default function InsurerCaseDetailPage() {
  const params = useParams();
  const caseId = params.caseId as string;
  const supabase = useMemo(() => createClient(), []);

  const [ready, setReady] = useState(false);
  const [caseData, setCaseData] = useState<InsuranceCaseDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageBody, setMessageBody] = useState("");
  const [sending, setSending] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);

  const fetchCase = useCallback(async () => {
    try {
      const res = await fetch(`/api/insurance-cases/${caseId}`, { cache: "no-store" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? "fetch_failed");
      }
      const data = await res.json();
      setCaseData(data);
    } catch (e: any) {
      setErr(e?.message ?? "fetch_failed");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        window.location.href = "/insurer/login";
        return;
      }
      setReady(true);
      await fetchCase();
    })();
  }, [supabase, fetchCase]);

  const handleSendMessage = async () => {
    if (!messageBody.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/insurance-cases/${caseId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: messageBody.trim(), visibility: "shared" }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? "send_failed");
      }
      setMessageBody("");
      await fetchCase();
    } catch (e: any) {
      setErr(e?.message ?? "send_failed");
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus: InsuranceCaseStatus) => {
    if (statusChanging) return;
    setStatusChanging(true);
    try {
      const res = await fetch(`/api/insurance-cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? "status_change_failed");
      }
      await fetchCase();
    } catch (e: any) {
      setErr(e?.message ?? "status_change_failed");
    } finally {
      setStatusChanging(false);
    }
  };

  if (!ready) return null;

  return (
    <main className="min-h-screen bg-neutral-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="inline-flex rounded-full border border-neutral-300 bg-white px-3 py-1 text-[11px] font-semibold tracking-[0.22em] text-neutral-600">
              INSURER PORTAL
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
                {caseData?.case_number ?? "案件詳細"}
              </h1>
              {caseData && (
                <p className="mt-2 text-sm text-neutral-600">
                  {caseData.title}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <Link
              href="/insurer/cases"
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              案件一覧
            </Link>
            <Link
              href="/insurer"
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              ダッシュボード
            </Link>
          </div>
        </header>

        {err && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        )}

        {loading && (
          <div className="text-center py-12 text-neutral-500">読み込み中...</div>
        )}

        {caseData && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main: Message Thread */}
            <div className="lg:col-span-2 space-y-4">
              {/* Messages */}
              <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                <div className="mb-4">
                  <div className="text-xs font-semibold tracking-[0.18em] text-neutral-500">MESSAGES</div>
                  <div className="mt-1 text-base font-semibold text-neutral-900">メッセージ</div>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto mb-4">
                  {caseData.messages.length === 0 && (
                    <div className="text-center py-8 text-sm text-neutral-500">
                      メッセージはまだありません。
                    </div>
                  )}
                  {caseData.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="rounded-xl border border-neutral-200 p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-neutral-900">
                            {msg.sender_name}
                          </span>
                          <span className="text-[10px] rounded-full border px-1.5 py-0.5 text-neutral-500">
                            {msg.sender_role}
                          </span>
                        </div>
                        <span className="text-xs text-neutral-500">
                          {formatDateTime(msg.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-700 whitespace-pre-wrap">
                        {msg.body}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <div className="border-t border-neutral-200 pt-4">
                  <textarea
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    placeholder="メッセージを入力..."
                    rows={3}
                    className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-400 resize-none"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={handleSendMessage}
                      disabled={!messageBody.trim() || sending}
                      className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
                    >
                      {sending ? "送信中..." : "送信"}
                    </button>
                  </div>
                </div>
              </section>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Status */}
              <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                <div className="text-xs font-semibold tracking-[0.18em] text-neutral-500 mb-3">STATUS</div>
                <div className="flex items-center gap-3 mb-4">
                  <CaseStatusBadge status={caseData.status} />
                </div>

                {/* Status Change Buttons */}
                {INSURER_TRANSITIONS[caseData.status] && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-neutral-500 mb-2">ステータス変更</div>
                    {INSURER_TRANSITIONS[caseData.status].map((t) => (
                      <button
                        key={t.to}
                        onClick={() => handleStatusChange(t.to)}
                        disabled={statusChanging}
                        className={`w-full rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-50 ${t.color}`}
                      >
                        {statusChanging ? "処理中..." : t.label}
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {/* Case Info */}
              <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                <div className="text-xs font-semibold tracking-[0.18em] text-neutral-500 mb-3">CASE INFO</div>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-neutral-500">案件番号</dt>
                    <dd className="font-mono text-neutral-900">{caseData.case_number}</dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">種別</dt>
                    <dd className="text-neutral-900">{CASE_TYPE_LABELS[caseData.case_type] ?? caseData.case_type}</dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">施工店</dt>
                    <dd className="text-neutral-900">{caseData.tenant_name}</dd>
                  </div>
                  {caseData.description && (
                    <div>
                      <dt className="text-neutral-500">説明</dt>
                      <dd className="text-neutral-900 whitespace-pre-wrap">{caseData.description}</dd>
                    </div>
                  )}
                  {caseData.damage_summary && (
                    <div>
                      <dt className="text-neutral-500">損傷概要</dt>
                      <dd className="text-neutral-900 whitespace-pre-wrap">{caseData.damage_summary}</dd>
                    </div>
                  )}
                  {caseData.admitted_at && (
                    <div>
                      <dt className="text-neutral-500">入庫日</dt>
                      <dd className="text-neutral-900">{caseData.admitted_at}</dd>
                    </div>
                  )}
                  {caseData.submitted_at && (
                    <div>
                      <dt className="text-neutral-500">提出日</dt>
                      <dd className="text-neutral-900">{formatDateTime(caseData.submitted_at)}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-neutral-500">最終更新</dt>
                    <dd className="text-neutral-900">{formatDateTime(caseData.updated_at)}</dd>
                  </div>
                </dl>
              </section>

              {/* Vehicle Info */}
              <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                <div className="text-xs font-semibold tracking-[0.18em] text-neutral-500 mb-3">VEHICLE</div>
                <div className="text-sm text-neutral-900">
                  {caseData.vehicle_summary || "-"}
                </div>
              </section>

              {/* Participants */}
              {caseData.participants.length > 0 && (
                <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                  <div className="text-xs font-semibold tracking-[0.18em] text-neutral-500 mb-3">PARTICIPANTS</div>
                  <div className="space-y-2">
                    {caseData.participants.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm">
                        <span className="text-neutral-900">
                          {p.display_name ?? p.user_id.slice(0, 8)}
                        </span>
                        <span className="text-[10px] rounded-full border px-1.5 py-0.5 text-neutral-500">
                          {p.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
