"use client";

import { useEffect, useState } from "react";

export default function VehicleReportSettingsClient() {
  const [priceJpy, setPriceJpy] = useState("3000");
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/platform/vehicle-report-settings")
      .then((r) => r.json())
      .then((j) => {
        if (typeof j?.price_jpy === "number") setPriceJpy(String(j.price_jpy));
        if (typeof j?.enabled === "boolean") setEnabled(j.enabled);
      })
      .catch(() => setErr("設定の取得に失敗しました。"))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    const n = Number(priceJpy);
    if (!Number.isInteger(n) || n < 100 || n > 1000000) {
      setErr("価格は 100〜1,000,000 の整数で入力してください。");
      return;
    }
    setSaving(true);
    setSaved(false);
    setErr(null);
    try {
      const res = await fetch("/api/admin/platform/vehicle-report-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price_jpy: n, enabled }),
      });
      if (!res.ok) throw new Error("save_failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setErr("保存に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-sm text-muted">読み込み中...</div>;

  return (
    <div className="glass-card max-w-xl space-y-5 p-5">
      <div>
        <label className="text-sm font-semibold text-primary">1 レポートあたりの価格（税込・円）</label>
        <p className="mt-0.5 text-xs text-muted">
          Stripe Checkout で都度課金されます。買取店などはアカウント登録不要で購入できます。
        </p>
        <input
          type="number"
          min={100}
          max={1000000}
          step={100}
          value={priceJpy}
          onChange={(e) => setPriceJpy(e.target.value)}
          className="input-field mt-2 w-48"
        />
      </div>

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="mt-0.5 accent-accent"
        />
        <div>
          <div className="text-sm font-medium text-primary">レポート販売を有効にする</div>
          <div className="mt-0.5 text-xs text-muted">
            無効にすると /v/[vin] の購入導線が停止します（既存の購入済みアクセスは有効期限まで維持）。
          </div>
        </div>
      </label>

      {err ? <div className="text-sm text-red-500">{err}</div> : null}
      {saved ? <div className="text-sm text-success">保存しました</div> : null}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="inline-flex items-center justify-center rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-60"
      >
        {saving ? "保存中..." : "保存する"}
      </button>
    </div>
  );
}
