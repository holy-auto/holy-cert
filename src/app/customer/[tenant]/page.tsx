"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Row = {
  public_id: string;
  customer_name: string;
  vehicle_info_json: any;
  created_at: string;
  status: string;
};

type VehicleInfo = Record<string, any> | null;

function normalizeVehicleInfo(v: any): VehicleInfo {
  if (v == null) return null;

  // Supabaseから string で来るケースも吸収
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    try {
      const j = JSON.parse(s);
      if (j && typeof j === "object" && !Array.isArray(j)) return j as Record<string, any>;
      return { value: j };
    } catch {
      return { value: s };
    }
  }

  if (typeof v === "object") {
    if (Array.isArray(v)) return { list: v };
    return v as Record<string, any>;
  }

  return { value: v };
}

function pick(obj: Record<string, any>, keys: string[]): any {
  for (const k of keys) {
    if (obj[k] != null && String(obj[k]).trim() !== "") return obj[k];
  }
  return null;
}

function toText(val: any): string {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  try {
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
}

function buildVehicleSummary(info: VehicleInfo) {
  if (!info) return { title: "車両情報なし", lines: [] as string[], raw: null as any };

  const make = pick(info, ["maker", "make", "manufacturer", "brand", "メーカー", "メーカ", "車メーカー"]);
  const model = pick(info, ["model", "car_model", "vehicle_model", "name", "車種", "車名", "モデル"]);
  const grade = pick(info, ["grade", "trim", "グレード"]);
  const plate = pick(info, ["plate", "license_plate", "number_plate", "plate_no", "reg_no", "ナンバー", "登録番号"]);
  const color = pick(info, ["color", "カラー", "色"]);
  const year = pick(info, ["year", "model_year", "年式"]);
  const vin = pick(info, ["vin", "frame_no", "chassis_no", "車台番号"]);
  const mileage = pick(info, ["mileage", "odo", "走行距離"]);

  const parts: string[] = [];
  const mk = toText(make).trim();
  const md = toText(model).trim();
  const gr = toText(grade).trim();
  const head = [mk, md, gr].filter(Boolean).join(" / ");

  if (head) parts.push(head);
  if (plate) parts.push(`ナンバー: ${toText(plate)}`);
  if (year) parts.push(`年式: ${toText(year)}`);
  if (color) parts.push(`色: ${toText(color)}`);
  if (mileage) parts.push(`走行距離: ${toText(mileage)}`);
  if (vin) parts.push(`車台番号: ${toText(vin)}`);

  const title = head || "車両情報";
  const lines = parts.filter((x) => x && x.trim() !== "");

  return { title, lines, raw: info };
}

export default function CustomerListPage() {
  const router = useRouter();
  const params = useParams() as any;
  const tenant = useMemo(() => (params?.tenant ?? "").toString(), [params]);

  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!tenant) return;

    setLoading(true);
    setErr(null);

    const res = await fetch(`/api/customer/list?tenant=${encodeURIComponent(tenant)}`, {
      cache: "no-store",
      credentials: "include",
    });

    const j = await res.json().catch(() => ({} as any));

    if (!res.ok) {
      const e = j?.error ?? "unauthorized";
      setErr(e);
      setRows([]);
      setLoading(false);

      if (res.status === 401) {
        router.replace(`/customer/${tenant}/login`);
      }
      return;
    }

    const rows: Row[] = (j.rows ?? []) as Row[];
    rows.sort((a, b) => {
      const av = String(a.status ?? "").toLowerCase() === "void";
      const bv = String(b.status ?? "").toLowerCase() === "void";
      if (av !== bv) return av ? 1 : -1; // void を下へ
      const at = Date.parse(String(a.created_at ?? ""));
      const bt = Date.parse(String(b.created_at ?? ""));
      if (!Number.isNaN(at) && !Number.isNaN(bt) && at !== bt) return bt - at; // 新しい順
      return String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""));
    });
    setRows(rows);
    setLoading(false);
  }

  async function logout() {
    try {
      await fetch("/api/customer/logout", { method: "POST", credentials: "include" });
    } finally {
      router.replace(`/customer/${tenant}/login`);
    }
  }

  useEffect(() => {
    if (!tenant) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant]);

  return (
    <main className="min-h-screen bg-base p-6">
      <div className="max-w-3xl mx-auto">
        <header className="flex justify-between items-center gap-3 mb-6">
          <div>
            <h1 className="text-xl font-bold text-primary">お客様の証明書一覧</h1>
            <div className="text-sm text-muted mt-1">店舗: {tenant || "..."}</div>
          </div>

          <div className="flex gap-2 items-center">
            <button
              onClick={load}
              disabled={!tenant || loading}
              className="btn-secondary disabled:opacity-50"
            >
              {loading ? "更新中…" : "更新"}
            </button>

            <button onClick={logout} className="btn-ghost">
              ログアウト
            </button>
          </div>
        </header>

        {err && (
          <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm mb-4">
            {err}（ログインが必要） →{" "}
            <a href={`/customer/${tenant}/login`} className="underline text-red-300 hover:text-red-200">
              ログインへ
            </a>
          </div>
        )}

        <div className="grid gap-3">
          {rows.map((r) => {
            const rt = encodeURIComponent(`/customer/${tenant}`);
            const href = `/c/${r.public_id}?tenant=${encodeURIComponent(tenant)}&rt=${rt}&logout=1`;

            const vi = normalizeVehicleInfo(r.vehicle_info_json);
            const vs = buildVehicleSummary(vi);

            const isVoid = (r.status ?? "").toLowerCase() === "void";
            const statusLabel = isVoid ? "無効の施工証明書" : "有効な施工証明書";

            return (
              <a key={r.public_id} href={href} className="no-underline text-inherit">
                <div
                  className={`glass-card p-4 grid gap-2 transition-colors hover:bg-surface-hover ${
                    isVoid ? "opacity-75 border-red-500/40" : ""
                  }`}
                >
                  <div className="flex justify-between gap-3 items-baseline">
                    <div className="text-xs text-muted">
                      {new Date(r.created_at).toLocaleString("ja-JP")}
                    </div>
                    <div
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        isVoid
                          ? "border-red-500/40 bg-red-500/10 text-red-400"
                          : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
                      {statusLabel}
                    </div>
                  </div>

                  <div className="text-base font-semibold text-primary">{r.customer_name}</div>

                  <div className="text-sm text-secondary">
                    <div className="font-semibold mb-0.5">{vs.title}</div>
                    {vs.lines.length ? (
                      <ul className="m-0 pl-5 space-y-0.5">
                        {vs.lines.map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-muted">詳細情報がありません。</div>
                    )}
                  </div>

                  {vi && (
                    <details className="text-xs text-muted">
                      <summary className="cursor-pointer hover:text-secondary">車両情報（raw）</summary>
                      <pre className="mt-2 mb-0 whitespace-pre-wrap bg-base rounded-lg p-3 border border-border-default text-xs text-secondary">
                        {JSON.stringify(vi, null, 2)}
                      </pre>
                    </details>
                  )}

                  <div className="flex justify-between gap-3">
                    <div className="text-xs text-muted">Public ID: {r.public_id}</div>
                    <div className="text-xs text-secondary">証明書を開く →</div>
                  </div>
                </div>
              </a>
            );
          })}

          {rows.length === 0 && !err && !loading && (
            <div className="text-muted text-center py-8">対象の証明書がありません。</div>
          )}
        </div>
      </div>
    </main>
  );
}
