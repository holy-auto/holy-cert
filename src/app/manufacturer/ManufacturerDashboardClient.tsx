"use client";

import { useEffect, useState } from "react";

type DashboardData = {
  manufacturer: {
    id: string;
    name: string;
    slug: string | null;
    logo_asset_path: string | null;
    website_url: string | null;
  } | null;
  counts: {
    certified_tenants_active: number;
    certified_tenants_revoked: number;
    templates_active: number;
    certificates_total: number;
    certificates_last_30d: number;
    certificates_this_month: number;
  };
  ranking: Array<{ tenant_id: string; tenant_name: string | null; certificate_count: number }>;
  recent_certificates: Array<{
    public_id: string;
    customer_name: string | null;
    service_type: string | null;
    created_at: string;
    tenant_name: string | null;
    template_name: string | null;
  }>;
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
  coating: "コーティング",
  ppf: "PPF",
  maintenance: "整備",
  body_repair: "鈑金塗装",
};

export default function ManufacturerDashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/manufacturer/dashboard", { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(json.message ?? "読み込みに失敗しました。");
        setData(json as DashboardData);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "読み込みに失敗しました。");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (err) {
    return (
      <div className="rounded-md border border-danger-border bg-danger-dim p-4 text-sm text-danger-text">{err}</div>
    );
  }
  if (!data) {
    return <div className="text-sm text-secondary">読み込み中...</div>;
  }

  return (
    <div className="space-y-6">
      <CountsGrid counts={data.counts} />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <RankingCard ranking={data.ranking} />
        </div>
        <div className="lg:col-span-3">
          <RecentCard recent={data.recent_certificates} />
        </div>
      </div>
    </div>
  );
}

function CountsGrid({ counts }: { counts: DashboardData["counts"] }) {
  const cards: Array<{ label: string; value: number; sub?: string }> = [
    {
      label: "認定中の施工店",
      value: counts.certified_tenants_active,
      sub: `(解除済 ${counts.certified_tenants_revoked} 社)`,
    },
    { label: "公開中のテンプレート", value: counts.templates_active },
    { label: "今月の発行件数", value: counts.certificates_this_month },
    { label: "直近30日の発行件数", value: counts.certificates_last_30d },
    { label: "累計発行件数", value: counts.certificates_total },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-border-subtle bg-surface p-4">
          <div className="text-xs font-medium text-secondary">{c.label}</div>
          <div className="mt-1 text-2xl font-bold text-primary">{c.value.toLocaleString("ja-JP")}</div>
          {c.sub && <div className="mt-1 text-xs text-muted">{c.sub}</div>}
        </div>
      ))}
    </div>
  );
}

function RankingCard({ ranking }: { ranking: DashboardData["ranking"] }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-5">
      <div className="mb-2">
        <div className="text-xs font-semibold tracking-[0.18em] text-muted">RANKING · 90 DAYS</div>
        <div className="mt-1 text-base font-semibold text-primary">施工店別 発行件数</div>
        <p className="mt-1 text-xs text-secondary">直近90日にメーカー指定デザインで発行された件数の上位10店舗。</p>
      </div>
      {ranking.length === 0 ? (
        <div className="rounded-md border border-border-subtle bg-base p-4 text-sm text-secondary">
          まだ発行実績がありません。
        </div>
      ) : (
        <ol className="divide-y divide-border-subtle">
          {ranking.map((r, idx) => (
            <li key={r.tenant_id} className="flex items-center justify-between gap-3 py-2">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface-hover text-xs font-bold text-secondary">
                  {idx + 1}
                </span>
                <span className="text-sm font-medium text-primary">{r.tenant_name ?? "(削除済テナント)"}</span>
              </div>
              <span className="text-sm font-semibold text-accent">
                {r.certificate_count.toLocaleString("ja-JP")} 件
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function RecentCard({ recent }: { recent: DashboardData["recent_certificates"] }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-5">
      <div className="mb-2">
        <div className="text-xs font-semibold tracking-[0.18em] text-muted">RECENT CERTIFICATES</div>
        <div className="mt-1 text-base font-semibold text-primary">最新発行履歴</div>
        <p className="mt-1 text-xs text-secondary">顧客名は個人情報保護のため一部マスクして表示しています。</p>
      </div>
      {recent.length === 0 ? (
        <div className="rounded-md border border-border-subtle bg-base p-4 text-sm text-secondary">
          まだ発行実績がありません。
        </div>
      ) : (
        <ul className="divide-y divide-border-subtle">
          {recent.map((c) => (
            <li key={c.public_id} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-primary">
                  {c.tenant_name ?? "(削除済テナント)"}
                  <span className="ml-2 text-xs font-normal text-secondary">{c.customer_name ?? "-"}</span>
                </div>
                <div className="text-xs text-muted">
                  {c.template_name ? `${c.template_name} / ` : ""}
                  {c.service_type ? (SERVICE_TYPE_LABELS[c.service_type] ?? c.service_type) : "サービス未指定"}
                  {" · "}
                  {new Date(c.created_at).toLocaleString("ja-JP", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              <a
                href={`/c/${encodeURIComponent(c.public_id)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-accent hover:underline"
              >
                公開ページ →
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
