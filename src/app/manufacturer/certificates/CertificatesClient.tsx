"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const SERVICE_TYPE_LABELS: Record<string, string> = {
  coating: "コーティング",
  ppf: "PPF",
  maintenance: "整備",
  body_repair: "鈑金塗装",
  general: "汎用",
};

type Item = {
  public_id: string;
  customer_name: string | null;
  service_type: string | null;
  created_at: string;
  status: string;
  tenant_id: string;
  tenant_name: string | null;
  template_id: string | null;
  template_name: string | null;
};

type TenantFilter = { id: string; name: string };
type TemplateFilter = { id: string; name: string };

const SERVICE_TYPES = ["coating", "ppf", "maintenance", "body_repair", "general"] as const;

export default function CertificatesClient() {
  const sp = useSearchParams();
  const initialTenant = sp.get("tenant_id") ?? "";
  const initialTemplate = sp.get("template_id") ?? "";

  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [tenantId, setTenantId] = useState(initialTenant);
  const [templateId, setTemplateId] = useState(initialTemplate);
  const [serviceType, setServiceType] = useState<string>("");

  const [tenantOptions, setTenantOptions] = useState<TenantFilter[]>([]);
  const [templateOptions, setTemplateOptions] = useState<TemplateFilter[]>([]);

  // Filter dropdowns are populated from the same endpoints used by the
  // dedicated pages, so the manufacturer never has to type IDs.
  useEffect(() => {
    (async () => {
      try {
        const [tRes, tplRes] = await Promise.all([
          fetch("/api/manufacturer/tenants?include_revoked=1", { cache: "no-store" }),
          fetch("/api/manufacturer/templates", { cache: "no-store" }),
        ]);
        if (tRes.ok) {
          const j = await tRes.json();
          setTenantOptions(
            (j.entries ?? [])
              .filter((e: { tenant_name: string | null }) => e.tenant_name)
              .map((e: { tenant_id: string; tenant_name: string }) => ({
                id: e.tenant_id,
                name: e.tenant_name,
              })),
          );
        }
        if (tplRes.ok) {
          const j = await tplRes.json();
          setTemplateOptions((j.entries ?? []).map((e: { id: string; name: string }) => ({ id: e.id, name: e.name })));
        }
      } catch {
        /* ignore — filters are optional */
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        if (tenantId) params.set("tenant_id", tenantId);
        if (templateId) params.set("template_id", templateId);
        if (serviceType) params.set("service_type", serviceType);
        const res = await fetch(`/api/manufacturer/certificates?${params.toString()}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(json.message ?? "読み込みに失敗しました。");
        setItems(json.items ?? []);
        setTotal(json.total ?? 0);
        setPageSize(json.page_size ?? 50);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "読み込みに失敗しました。");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, tenantId, templateId, serviceType]);

  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
        <select
          value={tenantId}
          onChange={(e) => {
            setTenantId(e.target.value);
            setPage(1);
          }}
          className="select-field"
        >
          <option value="">施工店: すべて</option>
          {tenantOptions.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={templateId}
          onChange={(e) => {
            setTemplateId(e.target.value);
            setPage(1);
          }}
          className="select-field"
        >
          <option value="">テンプレート: すべて</option>
          {templateOptions.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={serviceType}
          onChange={(e) => {
            setServiceType(e.target.value);
            setPage(1);
          }}
          className="select-field"
        >
          <option value="">サービス: すべて</option>
          {SERVICE_TYPES.map((s) => (
            <option key={s} value={s}>
              {SERVICE_TYPE_LABELS[s]}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            setTenantId("");
            setTemplateId("");
            setServiceType("");
            setPage(1);
          }}
          className="btn-secondary text-sm"
        >
          絞り込みをリセット
        </button>
      </div>

      {err && (
        <div className="rounded-md border border-danger-border bg-danger-dim p-3 text-sm text-danger-text">{err}</div>
      )}

      <div className="flex items-center justify-between text-xs text-muted">
        <span>該当 {total.toLocaleString("ja-JP")} 件</span>
        <span>
          {page} / {lastPage} ページ
        </span>
      </div>

      {loading ? (
        <div className="text-sm text-secondary">読み込み中...</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border-subtle bg-surface p-8 text-center text-sm text-secondary">
          該当する発行履歴はありません。
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-surface">
          <table className="min-w-full divide-y divide-border-subtle text-sm">
            <thead className="bg-surface-hover text-xs uppercase tracking-wider text-secondary">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">発行日時</th>
                <th className="px-4 py-2 text-left font-semibold">施工店</th>
                <th className="px-4 py-2 text-left font-semibold">テンプレート</th>
                <th className="px-4 py-2 text-left font-semibold">顧客</th>
                <th className="px-4 py-2 text-left font-semibold">サービス</th>
                <th className="px-4 py-2 text-left font-semibold">状態</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {items.map((it) => (
                <tr key={it.public_id}>
                  <td className="px-4 py-2 text-secondary whitespace-nowrap">
                    {new Date(it.created_at).toLocaleString("ja-JP", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-2 text-primary">{it.tenant_name ?? "(削除済)"}</td>
                  <td className="px-4 py-2 text-secondary">{it.template_name ?? "-"}</td>
                  <td className="px-4 py-2 text-secondary">{it.customer_name ?? "-"}</td>
                  <td className="px-4 py-2 text-secondary">
                    {it.service_type ? (SERVICE_TYPE_LABELS[it.service_type] ?? it.service_type) : "-"}
                  </td>
                  <td className="px-4 py-2">
                    {it.status === "active" ? (
                      <span className="inline-block rounded-full bg-success-dim px-2 py-0.5 text-xs font-semibold text-success-text">
                        有効
                      </span>
                    ) : (
                      <span className="inline-block rounded-full bg-surface-hover px-2 py-0.5 text-xs text-secondary">
                        {it.status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <a
                      href={`/c/${encodeURIComponent(it.public_id)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-accent hover:underline"
                    >
                      公開 →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {lastPage > 1 && (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="btn-secondary text-xs"
          >
            前へ
          </button>
          <button
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            disabled={page >= lastPage}
            className="btn-secondary text-xs"
          >
            次へ
          </button>
        </div>
      )}
    </div>
  );
}
