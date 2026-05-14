"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Entry = {
  certification_id: string;
  tenant_id: string;
  tenant_name: string | null;
  tenant_slug: string | null;
  status: "active" | "revoked";
  certified_at: string;
  revoked_at: string | null;
  notes: string | null;
  certificate_count_total: number;
  certificate_count_90d: number;
  last_issued_at: string | null;
};

export default function TenantsClient() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [includeRevoked, setIncludeRevoked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const reload = async () => {
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams();
      if (includeRevoked) params.set("include_revoked", "1");
      const res = await fetch(`/api/manufacturer/tenants?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "読み込みに失敗しました。");
      setEntries(json.entries ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeRevoked]);

  const filtered = entries.filter((e) =>
    query.trim() ? (e.tenant_name ?? "").toLowerCase().includes(query.trim().toLowerCase()) : true,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="施工店名で絞り込み"
          className="input-field max-w-xs"
        />
        <label className="flex items-center gap-2 text-sm text-secondary">
          <input type="checkbox" checked={includeRevoked} onChange={(e) => setIncludeRevoked(e.target.checked)} />
          解除済みも表示
        </label>
        <div className="flex-1" />
        <span className="text-xs text-muted">{filtered.length} 件</span>
      </div>

      {err && (
        <div className="rounded-md border border-danger-border bg-danger-dim p-3 text-sm text-danger-text">{err}</div>
      )}

      {loading ? (
        <div className="text-sm text-secondary">読み込み中...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border-subtle bg-surface p-8 text-center text-sm text-secondary">
          認定施工店はまだ登録されていません。
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-surface">
          <table className="min-w-full divide-y divide-border-subtle text-sm">
            <thead className="bg-surface-hover text-xs uppercase tracking-wider text-secondary">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">施工店</th>
                <th className="px-4 py-2 text-right font-semibold">累計発行</th>
                <th className="px-4 py-2 text-right font-semibold">直近90日</th>
                <th className="px-4 py-2 text-left font-semibold">最終発行</th>
                <th className="px-4 py-2 text-left font-semibold">認定状態</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filtered.map((e) => (
                <tr key={e.certification_id}>
                  <td className="px-4 py-2">
                    <div className="font-medium text-primary">{e.tenant_name ?? "(削除済テナント)"}</div>
                    {e.notes && <div className="text-xs text-muted">メモ: {e.notes}</div>}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-primary">
                    {e.certificate_count_total.toLocaleString("ja-JP")}
                  </td>
                  <td className="px-4 py-2 text-right text-accent">
                    {e.certificate_count_90d.toLocaleString("ja-JP")}
                  </td>
                  <td className="px-4 py-2 text-secondary">
                    {e.last_issued_at ? new Date(e.last_issued_at).toLocaleDateString("ja-JP") : "未発行"}
                  </td>
                  <td className="px-4 py-2">
                    {e.status === "active" ? (
                      <span className="inline-block rounded-full bg-success-dim px-2 py-0.5 text-xs font-semibold text-success-text">
                        認定中
                      </span>
                    ) : (
                      <span className="inline-block rounded-full bg-surface-hover px-2 py-0.5 text-xs text-secondary">
                        解除済
                        {e.revoked_at && (
                          <span className="ml-1 text-muted">
                            ({new Date(e.revoked_at).toLocaleDateString("ja-JP")})
                          </span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {e.certificate_count_total > 0 && (
                      <Link
                        href={`/manufacturer/certificates?tenant_id=${e.tenant_id}`}
                        className="text-xs font-medium text-accent hover:underline"
                      >
                        発行履歴 →
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
