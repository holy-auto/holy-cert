"use client";

import { useMemo, useState } from "react";
import type { Role } from "@/lib/auth/roles";
import { hasMinRole } from "@/lib/auth/roles";
import { hasPermission } from "@/lib/auth/permissions";
import { FEATURES, FEATURE_GROUPS, type FeatureDef } from "@/lib/features/catalog";

interface Props {
  role: Role;
  initialUserVisible: string[];
  initialTenantDisabled: string[];
}

const ADVANCED = FEATURES.filter((f) => f.tier === "advanced");

export default function FeaturesClient({ role, initialUserVisible, initialTenantDisabled }: Props) {
  const canManageTenant = hasMinRole(role, "admin");

  // Only offer features this role can actually open — a toggle for a
  // permission-gated page the user can't reach would just be confusing.
  const visibleForRole = useMemo(
    () => ADVANCED.filter((f) => !f.requiredPermission || hasPermission(role, f.requiredPermission)),
    [role],
  );

  const groups = useMemo(
    () =>
      FEATURE_GROUPS.map((g) => ({
        ...g,
        items: visibleForRole.filter((f) => f.groupKey === g.key),
      })).filter((g) => g.items.length > 0),
    [visibleForRole],
  );

  const [userSel, setUserSel] = useState<Set<string>>(() => new Set(initialUserVisible));
  const [tenantDisabled, setTenantDisabled] = useState<Set<string>>(() => new Set(initialTenantDisabled));

  const [savingUser, setSavingUser] = useState(false);
  const [savingTenant, setSavingTenant] = useState(false);
  const [userMsg, setUserMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [tenantMsg, setTenantMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function toggleUser(key: string) {
    setUserSel((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function setGroupUser(items: FeatureDef[], show: boolean) {
    setUserSel((prev) => {
      const next = new Set(prev);
      for (const f of items) {
        if (tenantDisabled.has(f.key)) continue; // can't show a tenant-disabled feature
        if (show) next.add(f.key);
        else next.delete(f.key);
      }
      return next;
    });
  }

  function toggleTenant(key: string) {
    setTenantDisabled((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function setGroupTenant(items: FeatureDef[], available: boolean) {
    setTenantDisabled((prev) => {
      const next = new Set(prev);
      for (const f of items) {
        if (available) next.delete(f.key);
        else next.add(f.key);
      }
      return next;
    });
  }

  async function save(
    url: string,
    body: Record<string, unknown>,
    setSaving: (v: boolean) => void,
    setMsg: (m: { ok: boolean; text: string } | null) => void,
  ) {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) {
        setMsg({ ok: false, text: j?.message ?? "保存に失敗しました。" });
        setSaving(false);
        return;
      }
      setMsg({ ok: true, text: "保存しました。サイドバーに反映します…" });
      // Reload so the (module-cached) sidebar picks up the new state.
      setTimeout(() => window.location.reload(), 700);
    } catch {
      setMsg({ ok: false, text: "通信エラーが発生しました。" });
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── 個人の表示設定 ───────────────────────────── */}
      <section className="glass-card p-5 space-y-5">
        <div>
          <div className="text-xs font-semibold tracking-[0.18em] text-muted">MY SIDEBAR</div>
          <div className="mt-1 text-base font-semibold text-primary">自分のサイドバー表示</div>
          <p className="mt-1 text-xs text-muted">
            使う機能だけオンにできます。ここで選んだ機能だけが自分のサイドバーに表示されます
            (他のメンバーには影響しません)。
          </p>
        </div>

        {userMsg && (
          <div
            className={`rounded-lg border px-3 py-2 text-xs ${
              userMsg.ok
                ? "border-success/20 bg-success-dim text-success-text"
                : "border-danger/20 bg-danger-dim text-danger-text"
            }`}
          >
            {userMsg.text}
          </div>
        )}

        {groups.map((g) => {
          const selectable = g.items.filter((f) => !tenantDisabled.has(f.key));
          const allOn = selectable.length > 0 && selectable.every((f) => userSel.has(f.key));
          return (
            <div key={g.key} className="rounded-xl border border-border-default bg-base p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-primary">{g.label}</div>
                <button
                  type="button"
                  className="btn-ghost text-xs"
                  onClick={() => setGroupUser(g.items, !allOn)}
                  disabled={savingUser || selectable.length === 0}
                >
                  {allOn ? "すべて非表示" : "すべて表示"}
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {g.items.map((f) => {
                  const disabledByTenant = tenantDisabled.has(f.key);
                  return (
                    <label
                      key={f.key}
                      className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${
                        disabledByTenant
                          ? "border-border-subtle bg-inset text-muted"
                          : "border-border-subtle bg-surface text-secondary"
                      }`}
                    >
                      <span>
                        {f.label}
                        {disabledByTenant && <span className="ml-2 text-[11px] text-muted">(テナントで無効)</span>}
                      </span>
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[var(--accent)]"
                        checked={!disabledByTenant && userSel.has(f.key)}
                        disabled={disabledByTenant || savingUser}
                        onChange={() => toggleUser(f.key)}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}

        <button
          type="button"
          className="btn-primary text-sm"
          disabled={savingUser}
          onClick={() => save("/api/admin/feature-prefs", { visibleFeatures: [...userSel] }, setSavingUser, setUserMsg)}
        >
          {savingUser ? "保存中..." : "表示設定を保存"}
        </button>
      </section>

      {/* ── テナントの利用可否 (オーナー / 管理者) ─────── */}
      {canManageTenant && (
        <section className="glass-card p-5 space-y-5">
          <div>
            <div className="text-xs font-semibold tracking-[0.18em] text-muted">TENANT</div>
            <div className="mt-1 text-base font-semibold text-primary">テナントで使える機能 (オーナー / 管理者)</div>
            <p className="mt-1 text-xs text-muted">
              初期状態ではすべて利用可能です。オフにした機能は、店舗の全メンバーが サイドバーに追加できなくなります。
            </p>
          </div>

          {tenantMsg && (
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                tenantMsg.ok
                  ? "border-success/20 bg-success-dim text-success-text"
                  : "border-danger/20 bg-danger-dim text-danger-text"
              }`}
            >
              {tenantMsg.text}
            </div>
          )}

          {groups.map((g) => {
            const allAvailable = g.items.every((f) => !tenantDisabled.has(f.key));
            return (
              <div key={g.key} className="rounded-xl border border-border-default bg-base p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-primary">{g.label}</div>
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    onClick={() => setGroupTenant(g.items, !allAvailable)}
                    disabled={savingTenant}
                  >
                    {allAvailable ? "すべて無効化" : "すべて利用可"}
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {g.items.map((f) => (
                    <label
                      key={f.key}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-secondary"
                    >
                      <span>{f.label}</span>
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[var(--accent)]"
                        checked={!tenantDisabled.has(f.key)}
                        disabled={savingTenant}
                        onChange={() => toggleTenant(f.key)}
                      />
                    </label>
                  ))}
                </div>
              </div>
            );
          })}

          <button
            type="button"
            className="btn-primary text-sm"
            disabled={savingTenant}
            onClick={() =>
              save(
                "/api/admin/feature-prefs/tenant",
                { disabledFeatures: [...tenantDisabled] },
                setSavingTenant,
                setTenantMsg,
              )
            }
          >
            {savingTenant ? "保存中..." : "テナント設定を保存"}
          </button>
        </section>
      )}
    </div>
  );
}
