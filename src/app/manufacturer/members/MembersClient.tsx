"use client";

import { useEffect, useState } from "react";

type Member = {
  id: string;
  user_id: string;
  role: "admin" | "viewer";
  display_name: string | null;
  email: string | null;
  is_active: boolean;
  is_self: boolean;
  created_at: string;
};

export default function MembersClient() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"admin" | "viewer">("viewer");
  const [inviting, setInviting] = useState(false);

  const reload = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/manufacturer/members", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "読み込みに失敗しました。");
      setMembers(json.members ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const invite = async () => {
    setInviting(true);
    setMsg(null);
    try {
      const res = await fetch("/api/manufacturer/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          display_name: displayName.trim() || undefined,
          role,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "招待に失敗しました。");
      setEmail("");
      setDisplayName("");
      setRole("viewer");
      setMsg("招待メールを送信しました。");
      reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "招待に失敗しました。");
    } finally {
      setInviting(false);
    }
  };

  const patch = async (m: Member, body: Record<string, unknown>) => {
    setBusyId(m.id);
    setMsg(null);
    try {
      const res = await fetch("/api/manufacturer/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: m.id, ...body }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "更新に失敗しました。");
      reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "更新に失敗しました。");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border-subtle bg-surface-hover p-3">
        <div className="text-sm font-medium text-primary mb-2">担当者を招待する</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="メールアドレス"
            className="input-field"
            type="email"
          />
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="表示名 (任意)"
            className="input-field"
          />
          <select value={role} onChange={(e) => setRole(e.target.value as "admin" | "viewer")} className="select-field">
            <option value="viewer">viewer (閲覧のみ)</option>
            <option value="admin">admin (認定・メンバー管理可)</option>
          </select>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-secondary">
            招待メールのリンクからパスワードを設定すると、メーカーポータルにログインできます。
          </p>
          <button onClick={invite} disabled={inviting || !email.trim()} className="btn-primary text-xs">
            {inviting ? "送信中..." : "招待を送信"}
          </button>
        </div>
      </div>

      {msg && (
        <div className="rounded-md border border-border-subtle bg-surface-hover p-3 text-sm text-secondary">{msg}</div>
      )}
      {err && (
        <div className="rounded-md border border-danger-border bg-danger-dim p-3 text-sm text-danger-text">{err}</div>
      )}

      {loading ? (
        <div className="text-sm text-secondary">読み込み中...</div>
      ) : members.length === 0 ? (
        <div className="rounded-2xl border border-border-subtle bg-surface p-8 text-center text-sm text-secondary">
          メンバーはまだ登録されていません。
        </div>
      ) : (
        <ul className="divide-y divide-border-subtle rounded-2xl border border-border-subtle bg-surface">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <div className="text-sm font-medium text-primary">
                  {m.display_name ?? m.email ?? "(名称未設定)"}
                  {m.is_self && <span className="ml-2 text-xs text-accent">(自分)</span>}
                  {!m.is_active && (
                    <span className="ml-2 rounded-full bg-surface-hover px-2 py-0.5 text-xs text-secondary">無効</span>
                  )}
                </div>
                <div className="text-xs text-muted">
                  {m.email ?? "メール不明"} · role: {m.role} · 追加:{" "}
                  {new Date(m.created_at).toLocaleDateString("ja-JP")}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!m.is_self && (
                  <select
                    value={m.role}
                    onChange={(e) => patch(m, { role: e.target.value })}
                    disabled={busyId === m.id}
                    className="select-field !w-auto !py-1 !text-xs"
                  >
                    <option value="viewer">viewer</option>
                    <option value="admin">admin</option>
                  </select>
                )}
                {!m.is_self && (
                  <button
                    onClick={() => patch(m, { is_active: !m.is_active })}
                    disabled={busyId === m.id}
                    className="btn-secondary text-xs"
                  >
                    {m.is_active ? "無効化" : "再有効化"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
