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

type Me = { role: "admin" | "viewer" } | null;

export default function TenantsClient() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [includeRevoked, setIncludeRevoked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [me, setMe] = useState<Me>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [showGrant, setShowGrant] = useState(false);

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

  // /me is fetched once on mount so the UI knows whether to show admin
  // controls. 403 / network failure → leaves me=null and hides them.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/manufacturer/me", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        setMe({ role: json.role });
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeRevoked]);

  const filtered = entries.filter((e) =>
    query.trim() ? (e.tenant_name ?? "").toLowerCase().includes(query.trim().toLowerCase()) : true,
  );

  const isAdmin = me?.role === "admin";

  const revoke = async (entry: Entry) => {
    if (!isAdmin) return;
    const confirmed = window.confirm(
      `${entry.tenant_name ?? "この施工店"} の認定を解除します。よろしいですか？\n` +
        `(累計 ${entry.certificate_count_total} 件 / 直近90日 ${entry.certificate_count_90d} 件)`,
    );
    if (!confirmed) return;
    setBusyId(entry.certification_id);
    setActionMsg(null);
    try {
      const res = await fetch("/api/manufacturer/certifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entry.certification_id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "解除に失敗しました。");
      setActionMsg(`${entry.tenant_name ?? ""} の認定を解除しました。`);
      reload();
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "解除に失敗しました。");
    } finally {
      setBusyId(null);
    }
  };

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
        {isAdmin && (
          <button onClick={() => setShowGrant(true)} className="btn-primary text-sm">
            ＋ 認定を追加
          </button>
        )}
      </div>

      {actionMsg && (
        <div className="rounded-md border border-border-subtle bg-surface-hover p-3 text-sm text-secondary">
          {actionMsg}
        </div>
      )}

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
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-3">
                      {e.certificate_count_total > 0 && (
                        <Link
                          href={`/manufacturer/certificates?tenant_id=${e.tenant_id}`}
                          className="text-xs font-medium text-accent hover:underline"
                        >
                          発行履歴 →
                        </Link>
                      )}
                      {isAdmin && e.status === "active" && (
                        <button
                          onClick={() => revoke(e)}
                          disabled={busyId === e.certification_id}
                          className="btn-secondary text-xs"
                        >
                          {busyId === e.certification_id ? "解除中..." : "解除"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showGrant && (
        <GrantCertificationModal
          onClose={() => setShowGrant(false)}
          onGranted={() => {
            setShowGrant(false);
            setActionMsg("認定を追加しました。");
            reload();
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grant modal (admin only)
// ---------------------------------------------------------------------------

type SearchHit = { id: string; name: string; slug: string | null };

function GrantCertificationModal({ onClose, onGranted }: { onClose: () => void; onGranted: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const search = async () => {
    if (q.trim().length < 2) {
      setSearchErr("2文字以上で検索してください。");
      setResults([]);
      return;
    }
    setSearching(true);
    setSearchErr(null);
    try {
      const res = await fetch(`/api/manufacturer/tenant-search?q=${encodeURIComponent(q.trim())}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "検索に失敗しました。");
      setResults(json.tenants ?? []);
      if ((json.tenants ?? []).length === 0) {
        setSearchErr("該当する施工店が見つかりません（既に認定中の店舗は除外されます）。");
      }
    } catch (e) {
      setSearchErr(e instanceof Error ? e.message : "検索に失敗しました。");
    } finally {
      setSearching(false);
    }
  };

  const grant = async (t: SearchHit) => {
    setBusyId(t.id);
    setErr(null);
    try {
      const res = await fetch("/api/manufacturer/certifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: t.id, notes: notes.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "認定に失敗しました。");
      onGranted();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "認定に失敗しました。");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-2xl bg-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">認定施工店を追加</h2>
          <button onClick={onClose} className="text-2xl leading-none text-secondary hover:text-primary">
            ×
          </button>
        </div>

        <p className="mb-3 text-xs text-secondary">
          施工店名で検索し、認定を付与します。既に認定中の店舗は検索結果から除外されます。
        </p>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="施工店名 (2文字以上)"
              className="input-field flex-1"
              autoFocus
            />
            <button onClick={search} disabled={searching} className="btn-secondary text-sm">
              {searching ? "..." : "検索"}
            </button>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-secondary">認定メモ (任意)</span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例: 2026年4月度更新 / 工場見学済み"
              className="input-field w-full"
            />
          </label>

          {searchErr && <div className="text-xs text-secondary">{searchErr}</div>}
          {err && <div className="text-sm text-danger-text">{err}</div>}

          {results.length > 0 && (
            <ul className="divide-y divide-border-subtle rounded-md border border-border-subtle bg-base">
              {results.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div>
                    <div className="text-sm font-medium text-primary">{t.name}</div>
                    {t.slug && <div className="text-xs text-muted">slug: {t.slug}</div>}
                  </div>
                  <button onClick={() => grant(t)} disabled={busyId === t.id} className="btn-primary text-xs">
                    {busyId === t.id ? "..." : "認定する"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="btn-secondary text-sm">
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
