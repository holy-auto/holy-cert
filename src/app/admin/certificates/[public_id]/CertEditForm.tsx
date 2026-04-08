"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { WORK_TYPE_OPTIONS } from "@/lib/maintenance/constants";
import {
  REPAIR_TYPE_OPTIONS,
  REPAIR_PANEL_OPTIONS,
  PAINT_TYPE_OPTIONS,
  REPAIR_METHOD_OPTIONS,
} from "@/lib/bodyRepair/constants";

// ── Types ──

type CoatingProduct = {
  location: string | null;
  brand_id: string | null;
  brand_name: string | null;
  product_id: string | null;
  product_name: string | null;
  lot_number: string | null;
  film_type?: string | null;
};

type PpfCoverage = {
  panel: string;
  coverage: "full" | "partial";
  partial_note?: string;
};

type Brand = { id: string; name: string; coating_products: { id: string; name: string; product_code: string | null }[] };

type CertData = {
  public_id: string;
  customer_name: string;
  vehicle_info_json: Record<string, unknown>;
  content_free_text: string | null;
  expiry_value: string | null;
  expiry_date: string | null;
  warranty_period_end: string | null;
  maintenance_date: string | null;
  warranty_exclusions: string | null;
  remarks: string | null;
  service_type: string | null;
  coating_products_json: CoatingProduct[];
  ppf_coverage_json: PpfCoverage[];
  maintenance_json: Record<string, unknown>;
  body_repair_json: Record<string, unknown>;
};

type Props = { cert: CertData };

// ── Constants ──

const AREA_PRESETS = [
  { value: "全体", label: "全体（ボディ全体）" },
  { value: "ボディ", label: "ボディ" },
  { value: "ボンネット", label: "ボンネット" },
  { value: "ルーフ", label: "ルーフ" },
  { value: "トランク", label: "トランク / リアゲート" },
  { value: "右フロント", label: "右フロント" },
  { value: "左フロント", label: "左フロント" },
  { value: "右リア", label: "右リア" },
  { value: "左リア", label: "左リア" },
  { value: "ホイール", label: "ホイール（全）" },
  { value: "フロントガラス", label: "フロントガラス" },
  { value: "リアガラス", label: "リアガラス" },
  { value: "サイドガラス", label: "サイドガラス" },
  { value: "内装", label: "内装" },
  { value: "バンパー", label: "バンパー / スポイラー" },
];

const FILM_TYPE_OPTIONS = [
  { value: "", label: "―" },
  { value: "gloss", label: "グロス（光沢）" },
  { value: "matte", label: "マット（艶消し）" },
  { value: "satin", label: "サテン" },
  { value: "color", label: "カラー" },
  { value: "black", label: "ブラック" },
];

const PPF_PANEL_PRESETS = [
  { code: "hood", label: "ボンネット" },
  { code: "front_bumper", label: "フロントバンパー" },
  { code: "rear_bumper", label: "リアバンパー" },
  { code: "front_fenders", label: "フロントフェンダー" },
  { code: "rear_fenders", label: "リアフェンダー/クォーター" },
  { code: "doors", label: "ドアパネル" },
  { code: "door_edges", label: "ドアエッジ" },
  { code: "door_cups", label: "ドアカップ" },
  { code: "rocker_panels", label: "ロッカーパネル" },
  { code: "a_pillars", label: "Aピラー" },
  { code: "b_pillars", label: "Bピラー" },
  { code: "side_mirrors", label: "サイドミラー" },
  { code: "roof", label: "ルーフ" },
  { code: "trunk_lid", label: "トランク/リアゲート" },
  { code: "headlights", label: "ヘッドライト" },
  { code: "taillights", label: "テールライト" },
  { code: "fog_lights", label: "フォグランプ" },
  { code: "windshield", label: "フロントガラス" },
  { code: "luggage_area", label: "荷室リップ" },
  { code: "full_body", label: "フルボディ" },
];

// ── Styles ──

const inputCls =
  "w-full rounded-xl border border-border-default bg-surface px-3 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent";
const selectCls =
  "w-full rounded-lg border border-border-default bg-surface px-2.5 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent";
const smallInputCls =
  "w-full rounded-lg border border-border-default bg-surface px-2.5 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent";
const labelCls = "block space-y-1.5";
const labelTextCls = "text-sm font-medium text-secondary";
const sectionTagCls = "text-xs font-semibold tracking-[0.18em] text-muted";
const sectionTitleCls = "mt-0.5 text-base font-semibold text-primary";

// ── Component ──

let _cpId = 1;

export default function CertEditForm({ cert }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const info = cert.vehicle_info_json ?? {};
  const isPpf = cert.service_type === "ppf";
  const isMaintenance = cert.service_type === "maintenance";
  const isBodyRepair = cert.service_type === "body_repair";
  const isCoatingOrPpf = !isMaintenance && !isBodyRepair;

  // ── Basic fields ──
  const [form, setForm] = useState({
    customer_name: cert.customer_name ?? "",
    vehicle_maker: String((info as any).maker ?? ""),
    vehicle_model: String((info as any).model ?? ""),
    vehicle_plate: String((info as any).plate ?? ""),
    content_free_text: cert.content_free_text ?? "",
    expiry_value: cert.expiry_value ?? "",
    expiry_date: cert.expiry_date ?? "",
    warranty_period_end: cert.warranty_period_end ?? "",
    maintenance_date: cert.maintenance_date ?? "",
    warranty_exclusions: cert.warranty_exclusions ?? "",
    remarks: cert.remarks ?? "",
  });

  // ── Coating products ──
  const [cpRows, setCpRows] = useState(() =>
    cert.coating_products_json.length > 0
      ? cert.coating_products_json.map((p) => ({ ...p, _id: _cpId++ }))
      : [{ _id: _cpId++, location: "", brand_id: null, brand_name: null, product_id: null, product_name: null, lot_number: null, film_type: null } as CoatingProduct & { _id: number }],
  );
  const [brands, setBrands] = useState<Brand[]>([]);

  // ── PPF coverage ──
  const [ppfRows, setPpfRows] = useState(() =>
    cert.ppf_coverage_json.length > 0
      ? cert.ppf_coverage_json.map((p, i) => ({ ...p, _id: i }))
      : [{ _id: 0, panel: "", coverage: "full" as const, partial_note: "" }],
  );

  // ── Maintenance ──
  const maint = cert.maintenance_json ?? {};
  const [maintForm, setMaintForm] = useState({
    work_types: (Array.isArray(maint.work_types) ? maint.work_types : []) as string[],
    mileage: String(maint.mileage ?? ""),
    parts_replaced: String(maint.parts_replaced ?? ""),
    next_service_date: String(maint.next_service_date ?? ""),
    findings: String(maint.findings ?? ""),
    mechanic_name: String(maint.mechanic_name ?? ""),
  });

  // ── Body repair ──
  const br = cert.body_repair_json ?? {};
  const [brForm, setBrForm] = useState({
    repair_type: String(br.repair_type ?? ""),
    affected_panels: (Array.isArray(br.affected_panels) ? br.affected_panels : []) as string[],
    paint_color_code: String(br.paint_color_code ?? ""),
    paint_type: String(br.paint_type ?? ""),
    repair_methods: (Array.isArray(br.repair_methods) ? br.repair_methods : []) as string[],
    warranty_info: String(br.warranty_info ?? ""),
    before_notes: String(br.before_notes ?? ""),
    after_notes: String(br.after_notes ?? ""),
  });

  // Load brands when editing coating/ppf
  useEffect(() => {
    if (!editing || !isCoatingOrPpf) return;
    fetch("/api/admin/brands")
      .then((r) => r.json())
      .then((j) => setBrands(j.brands ?? []))
      .catch(() => {});
  }, [editing, isCoatingOrPpf]);

  // ── Helpers ──

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const updateCp = (id: number, field: string, value: string) => {
    setCpRows((prev) =>
      prev.map((r) => {
        if (r._id !== id) return r;
        if (field === "brand_id") {
          const b = brands.find((b) => b.id === value);
          return { ...r, brand_id: value || null, brand_name: b?.name ?? null, product_id: null, product_name: null };
        }
        if (field === "product_id") {
          const b = brands.find((b) => b.id === r.brand_id);
          const p = b?.coating_products.find((p) => p.id === value);
          return { ...r, product_id: value || null, product_name: p?.name ?? null };
        }
        return { ...r, [field]: value || null };
      }),
    );
  };

  const buildPayload = () => {
    const payload: Record<string, unknown> = {
      public_id: cert.public_id,
      customer_name: form.customer_name.trim(),
      vehicle_info_json: { maker: form.vehicle_maker.trim(), model: form.vehicle_model.trim(), plate: form.vehicle_plate.trim() },
      content_free_text: form.content_free_text.trim() || null,
      expiry_value: form.expiry_value.trim() || null,
      expiry_date: form.expiry_date || null,
      warranty_period_end: form.warranty_period_end || null,
      maintenance_date: form.maintenance_date || null,
      warranty_exclusions: form.warranty_exclusions.trim() || null,
      remarks: form.remarks.trim() || null,
    };

    if (isCoatingOrPpf) {
      payload.coating_products_json = cpRows
        .filter((r) => r.location || r.brand_id)
        .map(({ _id, ...rest }) => ({
          location: rest.location || null,
          brand_id: rest.brand_id || null,
          brand_name: rest.brand_name || null,
          product_id: rest.product_id || null,
          product_name: rest.product_name || null,
          lot_number: rest.lot_number || null,
          ...(isPpf && rest.film_type ? { film_type: rest.film_type } : {}),
        }));
    }

    if (isPpf) {
      payload.ppf_coverage_json = ppfRows
        .filter((r) => r.panel)
        .map(({ _id, ...rest }) => ({
          panel: rest.panel,
          coverage: rest.coverage,
          ...(rest.coverage === "partial" && rest.partial_note ? { partial_note: rest.partial_note } : {}),
        }));
    }

    if (isMaintenance) {
      payload.maintenance_json = {
        work_types: maintForm.work_types,
        mileage: maintForm.mileage.trim() || null,
        parts_replaced: maintForm.parts_replaced.trim() || null,
        next_service_date: maintForm.next_service_date || null,
        findings: maintForm.findings.trim() || null,
        mechanic_name: maintForm.mechanic_name.trim() || null,
      };
    }

    if (isBodyRepair) {
      payload.body_repair_json = {
        repair_type: brForm.repair_type || null,
        affected_panels: brForm.affected_panels,
        paint_color_code: brForm.paint_color_code.trim() || null,
        paint_type: brForm.paint_type || null,
        repair_methods: brForm.repair_methods,
        warranty_info: brForm.warranty_info.trim() || null,
        before_notes: brForm.before_notes.trim() || null,
        after_notes: brForm.after_notes.trim() || null,
      };
    }

    return payload;
  };

  const handleSave = () => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/certificates/edit", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.message ?? "保存に失敗しました。"); return; }
        if (data.changed) {
          setSuccess(`${data.changes_count}件の変更を保存しました (v${data.version})`);
          setEditing(false);
          router.refresh();
        } else {
          setSuccess("変更はありません。");
        }
      } catch { setError("保存に失敗しました。"); }
    });
  };

  // ── Collapsed state ──

  if (!editing) {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={() => { setEditing(true); setSuccess(null); setError(null); }}
          className="rounded-xl border border-border-default bg-surface px-4 py-2 text-sm font-medium text-primary hover:bg-surface-hover"
        >
          編集する
        </button>
        {success && <span className="text-xs text-accent">{success}</span>}
      </div>
    );
  }

  // ── Expanded edit form ──

  return (
    <div className="glass-card p-5 space-y-6">
      <div>
        <div className={sectionTagCls}>EDIT</div>
        <div className="mt-1 text-lg font-semibold text-primary">証明書を編集</div>
        <p className="mt-1 text-xs text-muted">変更内容は編集履歴に記録されます。</p>
      </div>

      {/* ━━━ 基本情報 ━━━ */}
      <section className="space-y-4">
        <div><div className={sectionTagCls}>BASIC</div><div className={sectionTitleCls}>基本情報</div></div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelCls}><span className={labelTextCls}>顧客名</span><input value={form.customer_name} onChange={set("customer_name")} className={inputCls} /></label>
          <label className={labelCls}><span className={labelTextCls}>メーカー</span><input value={form.vehicle_maker} onChange={set("vehicle_maker")} className={inputCls} /></label>
          <label className={labelCls}><span className={labelTextCls}>車種</span><input value={form.vehicle_model} onChange={set("vehicle_model")} className={inputCls} /></label>
          <label className={labelCls}><span className={labelTextCls}>ナンバー</span><input value={form.vehicle_plate} onChange={set("vehicle_plate")} className={inputCls} /></label>
        </div>
        <label className={`${labelCls} block`}>
          <span className={labelTextCls}>施工内容（自由記述）</span>
          <textarea value={form.content_free_text} onChange={set("content_free_text")} className={inputCls} rows={4} />
        </label>
      </section>

      {/* ━━━ コーティング剤 / PPFフィルム ━━━ */}
      {isCoatingOrPpf && (
        <section className="border-t border-border-subtle pt-5 space-y-4">
          <div><div className={sectionTagCls}>{isPpf ? "PPF FILM" : "COATING PRODUCTS"}</div><div className={sectionTitleCls}>{isPpf ? "使用フィルム" : "コーティング剤"}</div></div>

          {cpRows.map((row) => {
            const brandProducts = brands.find((b) => b.id === row.brand_id)?.coating_products ?? [];
            return (
              <div key={row._id} className="grid grid-cols-1 gap-2 rounded-xl border border-border-subtle bg-inset p-3 sm:grid-cols-[2fr_2fr_2fr_1.5fr_auto] sm:bg-transparent sm:border-0 sm:p-0">
                {/* 部位 */}
                <div>
                  <span className="sm:hidden text-[11px] font-semibold text-muted mb-1 block">部位</span>
                  <select
                    value={AREA_PRESETS.some((p) => p.value === row.location) ? row.location ?? "" : row.location ? "_custom" : ""}
                    onChange={(e) => updateCp(row._id, "location", e.target.value === "_custom" ? "" : e.target.value)}
                    className={selectCls}
                  >
                    <option value="">部位を選択</option>
                    {AREA_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    <option value="_custom">その他</option>
                  </select>
                  {row.location && !AREA_PRESETS.some((p) => p.value === row.location) && (
                    <input value={row.location ?? ""} onChange={(e) => updateCp(row._id, "location", e.target.value)} placeholder="部位名" className={`${smallInputCls} mt-1`} />
                  )}
                </div>
                {/* ブランド */}
                <div>
                  <span className="sm:hidden text-[11px] font-semibold text-muted mb-1 block">ブランド</span>
                  <select value={row.brand_id ?? ""} onChange={(e) => updateCp(row._id, "brand_id", e.target.value)} className={selectCls}>
                    <option value="">選択</option>
                    {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                {/* 製品 */}
                <div>
                  <span className="sm:hidden text-[11px] font-semibold text-muted mb-1 block">製品</span>
                  <select value={row.product_id ?? ""} onChange={(e) => updateCp(row._id, "product_id", e.target.value)} disabled={!row.brand_id || brandProducts.length === 0} className={`${selectCls} disabled:opacity-50`}>
                    <option value="">選択</option>
                    {brandProducts.map((p) => <option key={p.id} value={p.id}>{p.name}{p.product_code ? ` (${p.product_code})` : ""}</option>)}
                  </select>
                </div>
                {/* ロット番号 (+ film_type for PPF) */}
                <div className="space-y-1">
                  {isPpf && (
                    <>
                      <span className="sm:hidden text-[11px] font-semibold text-muted mb-1 block">タイプ</span>
                      <select value={row.film_type ?? ""} onChange={(e) => updateCp(row._id, "film_type", e.target.value)} className={selectCls}>
                        {FILM_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </>
                  )}
                  <span className="sm:hidden text-[11px] font-semibold text-muted mb-1 block">ロット番号</span>
                  <input value={row.lot_number ?? ""} onChange={(e) => updateCp(row._id, "lot_number", e.target.value)} placeholder="ロット番号" className={smallInputCls} />
                </div>
                {/* 削除 */}
                <button type="button" onClick={() => setCpRows((prev) => prev.length > 1 ? prev.filter((r) => r._id !== row._id) : prev)} disabled={cpRows.length === 1} className="self-center rounded-lg border border-border-default px-2 py-1.5 text-xs text-muted hover:text-red-500 disabled:opacity-30">✕</button>
              </div>
            );
          })}
          <button type="button" onClick={() => setCpRows((prev) => [...prev, { _id: _cpId++, location: "", brand_id: null, brand_name: null, product_id: null, product_name: null, lot_number: null, film_type: null }])} className="rounded-lg border border-dashed border-border-default px-4 py-2 text-sm text-muted hover:text-primary">＋ 部位を追加</button>
        </section>
      )}

      {/* ━━━ PPF施工範囲 ━━━ */}
      {isPpf && (
        <section className="border-t border-border-subtle pt-5 space-y-4">
          <div><div className={sectionTagCls}>PPF COVERAGE</div><div className={sectionTitleCls}>PPF施工範囲</div></div>
          {ppfRows.map((row) => (
            <div key={row._id} className="grid grid-cols-1 gap-2 rounded-xl border border-border-subtle bg-inset p-3 sm:grid-cols-[2fr_1fr_2fr_auto] sm:bg-transparent sm:border-0 sm:p-0">
              <select value={row.panel} onChange={(e) => setPpfRows((prev) => prev.map((r) => r._id === row._id ? { ...r, panel: e.target.value } : r))} className={selectCls}>
                <option value="">パネルを選択</option>
                {PPF_PANEL_PRESETS.map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}
              </select>
              <select value={row.coverage} onChange={(e) => setPpfRows((prev) => prev.map((r) => r._id === row._id ? { ...r, coverage: e.target.value as "full" | "partial" } : r))} className={selectCls}>
                <option value="full">フル</option>
                <option value="partial">部分</option>
              </select>
              <input value={row.partial_note ?? ""} onChange={(e) => setPpfRows((prev) => prev.map((r) => r._id === row._id ? { ...r, partial_note: e.target.value } : r))} placeholder={row.coverage === "partial" ? "部分施工の備考" : ""} disabled={row.coverage !== "partial"} className={`${smallInputCls} disabled:opacity-40`} />
              <button type="button" onClick={() => setPpfRows((prev) => prev.length > 1 ? prev.filter((r) => r._id !== row._id) : prev)} disabled={ppfRows.length === 1} className="self-center rounded-lg border border-border-default px-2 py-1.5 text-xs text-muted hover:text-red-500 disabled:opacity-30">✕</button>
            </div>
          ))}
          <button type="button" onClick={() => setPpfRows((prev) => [...prev, { _id: Date.now(), panel: "", coverage: "full", partial_note: "" }])} className="rounded-lg border border-dashed border-border-default px-4 py-2 text-sm text-muted hover:text-primary">＋ パネルを追加</button>
        </section>
      )}

      {/* ━━━ 整備内容 ━━━ */}
      {isMaintenance && (
        <section className="border-t border-border-subtle pt-5 space-y-4">
          <div><div className={sectionTagCls}>MAINTENANCE</div><div className={sectionTitleCls}>整備内容</div></div>
          <div>
            <span className={labelTextCls}>作業種別</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {WORK_TYPE_OPTIONS.map((o) => (
                <button key={o.value} type="button" onClick={() => setMaintForm((prev) => ({ ...prev, work_types: prev.work_types.includes(o.value) ? prev.work_types.filter((v) => v !== o.value) : [...prev.work_types, o.value] }))} className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${maintForm.work_types.includes(o.value) ? "bg-accent text-inverse border-accent" : "bg-surface text-primary border-border-default hover:border-border-strong"}`}>{o.label}</button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className={labelCls}><span className={labelTextCls}>走行距離 (km)</span><input value={maintForm.mileage} onChange={(e) => setMaintForm((p) => ({ ...p, mileage: e.target.value }))} className={inputCls} /></label>
            <label className={labelCls}><span className={labelTextCls}>担当整備士</span><input value={maintForm.mechanic_name} onChange={(e) => setMaintForm((p) => ({ ...p, mechanic_name: e.target.value }))} className={inputCls} /></label>
            <label className={labelCls}><span className={labelTextCls}>次回点検日</span><input type="date" value={maintForm.next_service_date} onChange={(e) => setMaintForm((p) => ({ ...p, next_service_date: e.target.value }))} className={inputCls} /></label>
          </div>
          <label className={`${labelCls} block`}><span className={labelTextCls}>交換部品</span><textarea value={maintForm.parts_replaced} onChange={(e) => setMaintForm((p) => ({ ...p, parts_replaced: e.target.value }))} className={inputCls} rows={3} /></label>
          <label className={`${labelCls} block`}><span className={labelTextCls}>点検結果・所見</span><textarea value={maintForm.findings} onChange={(e) => setMaintForm((p) => ({ ...p, findings: e.target.value }))} className={inputCls} rows={3} /></label>
        </section>
      )}

      {/* ━━━ 鈑金塗装 ━━━ */}
      {isBodyRepair && (
        <section className="border-t border-border-subtle pt-5 space-y-4">
          <div><div className={sectionTagCls}>BODY REPAIR</div><div className={sectionTitleCls}>鈑金塗装内容</div></div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className={labelCls}>
              <span className={labelTextCls}>修理種別</span>
              <select value={brForm.repair_type} onChange={(e) => setBrForm((p) => ({ ...p, repair_type: e.target.value }))} className={inputCls}>
                <option value="">選択</option>
                {REPAIR_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label className={labelCls}><span className={labelTextCls}>塗装色・カラーコード</span><input value={brForm.paint_color_code} onChange={(e) => setBrForm((p) => ({ ...p, paint_color_code: e.target.value }))} className={inputCls} /></label>
            <label className={labelCls}>
              <span className={labelTextCls}>塗装タイプ</span>
              <select value={brForm.paint_type} onChange={(e) => setBrForm((p) => ({ ...p, paint_type: e.target.value }))} className={inputCls}>
                <option value="">選択</option>
                {PAINT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          </div>
          <div>
            <span className={labelTextCls}>修理箇所</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {REPAIR_PANEL_OPTIONS.map((o) => (
                <button key={o.value} type="button" onClick={() => setBrForm((p) => ({ ...p, affected_panels: p.affected_panels.includes(o.value) ? p.affected_panels.filter((v) => v !== o.value) : [...p.affected_panels, o.value] }))} className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${brForm.affected_panels.includes(o.value) ? "bg-accent text-inverse border-accent" : "bg-surface text-primary border-border-default hover:border-border-strong"}`}>{o.label}</button>
              ))}
            </div>
          </div>
          <div>
            <span className={labelTextCls}>修理方法</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {REPAIR_METHOD_OPTIONS.map((o) => (
                <button key={o.value} type="button" onClick={() => setBrForm((p) => ({ ...p, repair_methods: p.repair_methods.includes(o.value) ? p.repair_methods.filter((v) => v !== o.value) : [...p.repair_methods, o.value] }))} className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${brForm.repair_methods.includes(o.value) ? "bg-accent text-inverse border-accent" : "bg-surface text-primary border-border-default hover:border-border-strong"}`}>{o.label}</button>
              ))}
            </div>
          </div>
          <label className={`${labelCls} block`}><span className={labelTextCls}>修理前の状態</span><textarea value={brForm.before_notes} onChange={(e) => setBrForm((p) => ({ ...p, before_notes: e.target.value }))} className={inputCls} rows={2} /></label>
          <label className={`${labelCls} block`}><span className={labelTextCls}>修理後の状態</span><textarea value={brForm.after_notes} onChange={(e) => setBrForm((p) => ({ ...p, after_notes: e.target.value }))} className={inputCls} rows={2} /></label>
          <label className={`${labelCls} block`}><span className={labelTextCls}>修理保証情報</span><textarea value={brForm.warranty_info} onChange={(e) => setBrForm((p) => ({ ...p, warranty_info: e.target.value }))} className={inputCls} rows={2} /></label>
        </section>
      )}

      {/* ━━━ 有効期限・保証 ━━━ */}
      <section className="border-t border-border-subtle pt-5 space-y-4">
        <div><div className={sectionTagCls}>EXPIRY &amp; WARRANTY</div><div className={sectionTitleCls}>有効期限・保証</div></div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelCls}><span className={labelTextCls}>有効条件</span><input value={form.expiry_value} onChange={set("expiry_value")} className={inputCls} /></label>
          <label className={labelCls}><span className={labelTextCls}>有効期限</span><input type="date" value={form.expiry_date} onChange={set("expiry_date")} className={inputCls} /></label>
          <label className={labelCls}><span className={labelTextCls}>保証期間（終了日）</span><input type="date" value={form.warranty_period_end} onChange={set("warranty_period_end")} className={inputCls} /></label>
          <label className={labelCls}><span className={labelTextCls}>メンテナンス実施日</span><input type="date" value={form.maintenance_date} onChange={set("maintenance_date")} className={inputCls} /></label>
        </div>
        <label className={`${labelCls} block`}><span className={labelTextCls}>保証除外内容</span><textarea value={form.warranty_exclusions} onChange={set("warranty_exclusions")} className={inputCls} rows={3} /></label>
        <label className={`${labelCls} block`}><span className={labelTextCls}>備考</span><textarea value={form.remarks} onChange={set("remarks")} className={inputCls} rows={2} /></label>
      </section>

      {/* ━━━ エラー & アクション ━━━ */}
      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-danger">{error}</div>}

      <div className="flex gap-3 items-center">
        <button onClick={handleSave} disabled={isPending} className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-inverse hover:bg-accent/90 disabled:opacity-50">{isPending ? "保存中…" : "変更を保存"}</button>
        <button onClick={() => { setEditing(false); setError(null); }} disabled={isPending} className="rounded-xl border border-border-default bg-surface px-5 py-2.5 text-sm font-medium text-primary hover:bg-surface-hover">キャンセル</button>
      </div>
    </div>
  );
}
