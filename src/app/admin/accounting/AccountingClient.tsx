"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { parseJsonSafe } from "@/lib/api/safeJson";
import { formatDateTime } from "@/lib/format";

type ProviderId = "freee" | "moneyforward";

interface IntegrationSummary {
  provider: ProviderId;
  status: "pending" | "active" | "disconnected" | "error" | "not_connected";
  external_company_name: string | null;
  default_sales_account_name: string | null;
  default_tax_rate: number | null;
  auto_sync_enabled: boolean;
  last_synced_at: string | null;
  last_error: string | null;
  connected_at: string | null;
}

interface AccountingResponse {
  providers: IntegrationSummary[];
  stats_30d: Record<ProviderId, { synced: number; failed: number }>;
}

const PROVIDER_META: Record<ProviderId, { label: string; tagline: string; brand: string }> = {
  freee: {
    label: "freee 会計",
    tagline: "個人事業主・スタートアップ向け国内シェア No.1 クラウド会計",
    brand: "var(--accent-emerald)",
  },
  moneyforward: {
    label: "マネーフォワード クラウド",
    tagline: "中小企業に強い会計クラウド。パートナー審査後にご利用いただけます",
    brand: "var(--accent-blue)",
  },
};

const STATUS_COPY: Record<IntegrationSummary["status"], { label: string; tone: string }> = {
  active: { label: "連携中", tone: "var(--accent-emerald)" },
  pending: { label: "認可待ち", tone: "var(--accent-amber)" },
  error: { label: "再認可が必要", tone: "var(--accent-red)" },
  disconnected: { label: "連携解除済", tone: "var(--text-muted)" },
  not_connected: { label: "未連携", tone: "var(--text-muted)" },
};

export default function AccountingClient() {
  const { toast } = useToast();
  const search = useSearchParams();
  const [data, setData] = useState<AccountingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<ProviderId | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/accounting", { cache: "no-store" });
      const body = await parseJsonSafe<AccountingResponse>(res);
      if (body) setData(body);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // OAuth コールバック後のフィードバック
  useEffect(() => {
    const status = search.get("status");
    const error = search.get("error");
    const provider = search.get("provider") as ProviderId | null;
    if (status === "connected" && provider) {
      toast(`${PROVIDER_META[provider].label} に接続しました`, "success");
    } else if (error && provider) {
      const map: Record<string, string> = {
        denied: "認可がキャンセルされました",
        unauthorized: "このテナントへのアクセス権がありません",
        forbidden: "オーナー / 管理者ロールが必要です",
        unauthenticated: "ログインが必要です",
        exchange_failed: "トークン取得に失敗しました",
        db_save: "保存に失敗しました",
        missing_params: "リダイレクト URL が不正です",
      };
      toast(`${PROVIDER_META[provider].label}: ${map[error] ?? error}`, "error");
    }
  }, [search, toast]);

  const connect = useCallback(
    async (provider: ProviderId) => {
      setBusy(provider);
      try {
        const res = await fetch(`/api/admin/accounting/${provider}/connect`, { method: "POST" });
        const body = await parseJsonSafe<{ auth_url?: string; message?: string }>(res);
        if (body?.auth_url) {
          window.location.href = body.auth_url;
          return;
        }
        toast(body?.message ?? "接続 URL の取得に失敗しました", "error");
      } finally {
        setBusy(null);
      }
    },
    [toast],
  );

  const disconnect = useCallback(
    async (provider: ProviderId) => {
      if (!window.confirm(`${PROVIDER_META[provider].label} の連携を解除しますか?`)) return;
      setBusy(provider);
      try {
        const res = await fetch(`/api/admin/accounting/${provider}/connect`, { method: "DELETE" });
        if (res.ok) {
          toast("連携を解除しました", "success");
          load();
        } else {
          toast("解除に失敗しました", "error");
        }
      } finally {
        setBusy(null);
      }
    },
    [load, toast],
  );

  const sync = useCallback(
    async (provider: ProviderId) => {
      setBusy(provider);
      try {
        const res = await fetch(`/api/admin/accounting/${provider}/sync`, { method: "POST" });
        const body = await parseJsonSafe<{
          synced?: number;
          failed?: number;
          attempted?: number;
          message?: string;
        }>(res);
        if (res.ok && body) {
          toast(`同期完了: ${body.synced ?? 0} 件成功 / ${body.failed ?? 0} 件失敗`, "success");
          load();
        } else {
          toast(body?.message ?? "同期に失敗しました", "error");
        }
      } finally {
        setBusy(null);
      }
    },
    [load, toast],
  );

  const toggleAutoSync = useCallback(
    async (provider: ProviderId, next: boolean) => {
      setBusy(provider);
      try {
        const res = await fetch(`/api/admin/accounting/${provider}/settings`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ auto_sync_enabled: next }),
        });
        if (res.ok) {
          toast(`自動同期を${next ? "有効" : "停止"}にしました`, "success");
          load();
        } else {
          toast("更新に失敗しました", "error");
        }
      } finally {
        setBusy(null);
      }
    },
    [load, toast],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">会計ソフト連携</h1>
        <p className="text-sm text-[var(--text-muted)]">
          連携すると、Ledra で「支払い済み」になった請求書が自動で会計ソフトに仕訳投入されます。
          月末の入力作業がゼロになります。
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {data?.providers.map((integration) => (
          <ProviderCard
            key={integration.provider}
            integration={integration}
            stats={data.stats_30d[integration.provider]}
            busy={busy === integration.provider}
            onConnect={() => connect(integration.provider)}
            onDisconnect={() => disconnect(integration.provider)}
            onSync={() => sync(integration.provider)}
            onToggleAutoSync={(next) => toggleAutoSync(integration.provider, next)}
          />
        ))}
      </div>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 text-sm">
        <h2 className="mb-2 text-base font-semibold">同期される売上</h2>
        <ul className="list-disc space-y-1 pl-5 text-[var(--text-muted)]">
          <li>請求書 (ステータスが「支払済み」になったもの)</li>
          <li>POS 会計の現金売上 — 近日対応</li>
          <li>Stripe Connect のオンライン決済 — 近日対応</li>
        </ul>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          適格請求書 (インボイス制度) に対応した税率別仕訳で送信します。設定 →
          店舗設定の「適格請求書発行事業者登録番号」が freee / マネーフォワードに自動で連携されます。
        </p>
      </section>
    </div>
  );
}

function ProviderCard({
  integration,
  stats,
  busy,
  onConnect,
  onDisconnect,
  onSync,
  onToggleAutoSync,
}: {
  integration: IntegrationSummary;
  stats: { synced: number; failed: number } | undefined;
  busy: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSync: () => void;
  onToggleAutoSync: (next: boolean) => void;
}) {
  const meta = PROVIDER_META[integration.provider];
  const status = STATUS_COPY[integration.status];
  const isActive = integration.status === "active";

  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: meta.brand }} />
            <h2 className="text-lg font-semibold">{meta.label}</h2>
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{meta.tagline}</p>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-xs"
          style={{ color: status.tone, border: `1px solid ${status.tone}` }}
        >
          {status.label}
        </span>
      </header>

      {isActive && (
        <dl className="mb-4 space-y-1 text-sm">
          <Row label="連携先" value={integration.external_company_name ?? "—"} />
          <Row label="売上勘定" value={integration.default_sales_account_name ?? "—"} />
          <Row
            label="標準税率"
            value={integration.default_tax_rate != null ? `${integration.default_tax_rate}%` : "—"}
          />
          <Row
            label="最終同期"
            value={integration.last_synced_at ? formatDateTime(integration.last_synced_at) : "未実行"}
          />
          {stats && <Row label="直近 30 日" value={`${stats.synced} 件同期 / ${stats.failed} 件確認待ち`} />}
        </dl>
      )}

      {integration.last_error && (
        <p className="mb-4 rounded-md border border-[var(--accent-red)] bg-[var(--accent-red-bg)] p-2 text-xs text-[var(--accent-red)]">
          {integration.last_error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!isActive && (
          <button
            type="button"
            onClick={onConnect}
            disabled={busy}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "..." : `${meta.label} に接続`}
          </button>
        )}
        {isActive && (
          <>
            <button
              type="button"
              onClick={onSync}
              disabled={busy}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              今すぐ同期
            </button>
            <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <input
                type="checkbox"
                checked={integration.auto_sync_enabled}
                onChange={(e) => onToggleAutoSync(e.target.checked)}
                disabled={busy}
              />
              自動同期 (1 日 3 回)
            </label>
            <button
              type="button"
              onClick={onDisconnect}
              disabled={busy}
              className="ml-auto rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-muted)] disabled:opacity-50"
            >
              連携解除
            </button>
          </>
        )}
      </div>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
