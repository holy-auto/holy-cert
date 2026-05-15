"use client";

import { useEffect, useState } from "react";

type AuditEvent = {
  type: "certified" | "revoked";
  at: string;
  tenant_name: string | null;
  actor_label: string;
  notes: string | null;
};

export default function AuditClient() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/manufacturer/audit", { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(json.message ?? "読み込みに失敗しました。");
        setEvents(json.events ?? []);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "読み込みに失敗しました。");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (err) {
    return (
      <div className="rounded-md border border-danger-border bg-danger-dim p-3 text-sm text-danger-text">{err}</div>
    );
  }
  if (loading) return <div className="text-sm text-secondary">読み込み中...</div>;

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface p-8 text-center text-sm text-secondary">
        操作履歴はまだありません。
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-surface">
      <table className="min-w-full divide-y divide-border-subtle text-sm">
        <thead className="bg-surface-hover text-xs uppercase tracking-wider text-secondary">
          <tr>
            <th className="px-4 py-2 text-left font-semibold">日時</th>
            <th className="px-4 py-2 text-left font-semibold">操作</th>
            <th className="px-4 py-2 text-left font-semibold">施工店</th>
            <th className="px-4 py-2 text-left font-semibold">実行者</th>
            <th className="px-4 py-2 text-left font-semibold">メモ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {events.map((e, i) => (
            <tr key={`${e.at}-${e.type}-${i}`}>
              <td className="px-4 py-2 whitespace-nowrap text-secondary">
                {new Date(e.at).toLocaleString("ja-JP", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td className="px-4 py-2">
                {e.type === "certified" ? (
                  <span className="inline-block rounded-full bg-success-dim px-2 py-0.5 text-xs font-semibold text-success-text">
                    認定
                  </span>
                ) : (
                  <span className="inline-block rounded-full bg-danger-dim px-2 py-0.5 text-xs font-semibold text-danger-text">
                    解除
                  </span>
                )}
              </td>
              <td className="px-4 py-2 text-primary">{e.tenant_name ?? "(削除済テナント)"}</td>
              <td className="px-4 py-2 text-secondary">{e.actor_label}</td>
              <td className="px-4 py-2 text-muted">{e.notes ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
