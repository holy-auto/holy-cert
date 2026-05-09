"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import PageHeader from "@/components/ui/PageHeader";
import { formatJpy } from "@/lib/format";
import { fetcher } from "@/lib/swr";
import { parseJsonSafe } from "@/lib/api/safeJson";
import {
  SERVICE_PACKAGE_CATEGORIES,
  SERVICE_PACKAGE_CATEGORY_LABEL,
  PRICE_STRATEGIES,
  type PriceStrategy,
  type ServicePackageCategory,
} from "@/lib/validations/service-package";

type MenuItemRow = {
  id: string;
  name: string;
  description: string | null;
  unit_price: number | null;
  tax_category: number | null;
  is_active: boolean;
};

type TemplateRow = {
  id: string;
  name: string;
  schema_json?: { category?: string | null } | null;
};

type PackageDetail = {
  package: {
    id: string;
    name: string;
    description: string | null;
    category: ServicePackageCategory;
    price_strategy: PriceStrategy;
    fixed_price: number | null;
    recommended_template_id: string | null;
    sort_order: number;
    is_archived: boolean;
  };
  items: Array<{
    id: string;
    menu_item_id: string;
    quantity: number;
    override_unit_price: number | null;
    is_archived: boolean;
    sort_order: number;
  }>;
};

type EditorItem = {
  /** 既存行は server id, 新規行は client uuid (送信時には捨てる) */
  key: string;
  menu_item_id: string;
  quantity: number;
  override_unit_price: number | null;
};

const PRICE_STRATEGY_LABEL: Record<PriceStrategy, string> = {
  sum_of_items: "明細合計",
  fixed: "固定価格",
  manual: "手動 (展開後に手入力)",
};

function clientKey(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function PackageEditor({ packageId }: { packageId: string | null }) {
  const router = useRouter();
  const isNew = packageId === null;

  const { data: detail, isLoading: loadingDetail } = useSWR<PackageDetail>(
    isNew ? null : `/api/admin/service-packages/${packageId}`,
    fetcher,
    { revalidateOnFocus: false },
  );

  const { data: menuData } = useSWR<{ items: MenuItemRow[] }>("/api/admin/menu-items?active_only=true", fetcher, {
    revalidateOnFocus: false,
  });
  const menuItems = useMemo(() => menuData?.items ?? [], [menuData]);

  const { data: tplData } = useSWR<{ templates: TemplateRow[] }>("/api/admin/templates", fetcher, {
    revalidateOnFocus: false,
  });
  const templates = tplData?.templates ?? [];

  // ─── form state ───
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ServicePackageCategory>("general");
  const [priceStrategy, setPriceStrategy] = useState<PriceStrategy>("sum_of_items");
  const [fixedPrice, setFixedPrice] = useState("");
  const [recommendedTemplateId, setRecommendedTemplateId] = useState<string>("");
  const [sortOrder, setSortOrder] = useState("0");
  const [items, setItems] = useState<EditorItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // ─── menu picker ───
  const [search, setSearch] = useState("");
  const filteredMenu = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return menuItems.slice(0, 30);
    return menuItems.filter((m) => m.name.toLowerCase().includes(q) || (m.description ?? "").toLowerCase().includes(q));
  }, [menuItems, search]);

  // hydrate from server (one-shot when SWR resolves)
  useEffect(() => {
    if (!detail || isNew) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: hydrate form from SWR-loaded server detail
    setName(detail.package.name);
    setDescription(detail.package.description ?? "");
    setCategory(detail.package.category);
    setPriceStrategy(detail.package.price_strategy);
    setFixedPrice(detail.package.fixed_price != null ? String(detail.package.fixed_price) : "");
    setRecommendedTemplateId(detail.package.recommended_template_id ?? "");
    setSortOrder(String(detail.package.sort_order ?? 0));
    setItems(
      detail.items
        .filter((it) => !it.is_archived)
        .map((it) => ({
          key: it.id,
          menu_item_id: it.menu_item_id,
          quantity: Number(it.quantity),
          override_unit_price: it.override_unit_price,
        })),
    );
  }, [detail, isNew]);

  // ─── derived totals ───
  const itemsTotal = useMemo(() => {
    let sum = 0;
    for (const it of items) {
      const menu = menuItems.find((m) => m.id === it.menu_item_id);
      const unit = it.override_unit_price ?? menu?.unit_price ?? 0;
      sum += Math.round(unit * (it.quantity || 0));
    }
    return sum;
  }, [items, menuItems]);

  const previewPrice =
    priceStrategy === "fixed" ? Number(fixedPrice || 0) : priceStrategy === "manual" ? null : itemsTotal;

  const addItem = (menuId: string) => {
    if (items.some((it) => it.menu_item_id === menuId)) return; // 重複防止
    setItems((arr) => [
      ...arr,
      { key: clientKey("new"), menu_item_id: menuId, quantity: 1, override_unit_price: null },
    ]);
    setSearch("");
  };

  const removeItem = (key: string) => setItems((arr) => arr.filter((it) => it.key !== key));

  const moveItem = (key: string, dir: -1 | 1) => {
    setItems((arr) => {
      const idx = arr.findIndex((it) => it.key === key);
      if (idx < 0) return arr;
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return arr;
      const next = [...arr];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const updateItem = (key: string, patch: Partial<EditorItem>) =>
    setItems((arr) => arr.map((it) => (it.key === key ? { ...it, ...patch } : it)));

  const validate = (): string | null => {
    if (!name.trim()) return "パッケージ名は必須です。";
    if (priceStrategy === "fixed" && (!fixedPrice || Number(fixedPrice) < 0))
      return "固定価格には 0 以上の数値を入力してください。";
    for (const it of items) {
      if (!it.menu_item_id) return "メニュー品目を選択してください。";
      if (!(it.quantity > 0)) return "数量は 0 より大きい値にしてください。";
    }
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) {
      setMsg({ text: err, ok: false });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        category,
        price_strategy: priceStrategy,
        fixed_price: priceStrategy === "fixed" ? Number(fixedPrice) : null,
        recommended_template_id: recommendedTemplateId || null,
        sort_order: Number(sortOrder) || 0,
        items: items.map((it, idx) => ({
          menu_item_id: it.menu_item_id,
          quantity: it.quantity,
          override_unit_price: it.override_unit_price ?? null,
          sort_order: idx,
        })),
      };

      let res: Response;
      if (isNew) {
        res = await fetch("/api/admin/service-packages", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/admin/service-packages/${packageId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      const j = await parseJsonSafe(res);
      if (!res.ok) throw new Error(j?.message ?? `HTTP ${res.status}`);

      const newId = isNew ? j?.package?.id : packageId;
      setMsg({ text: "保存しました。", ok: true });
      if (isNew && newId) {
        router.replace(`/admin/service-packages/${newId}`);
      }
    } catch (e: unknown) {
      setMsg({ text: e instanceof Error ? e.message : String(e), ok: false });
    } finally {
      setSaving(false);
    }
  };

  if (!isNew && loadingDetail) {
    return <div className="text-sm text-muted">読み込み中…</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        tag="施工テンプレート"
        title={isNew ? "新規パッケージ" : "パッケージ編集"}
        description="メニュー品目をバンドルして、案件・見積・証明書発行で再利用できるようにします。"
        actions={
          <Link href="/admin/service-packages" className="btn-ghost">
            ← 一覧へ戻る
          </Link>
        }
      />

      {msg && (
        <div className={`text-sm ${msg.ok ? "text-success" : "text-danger"}`} data-testid="package-editor-message">
          {msg.text}
        </div>
      )}

      <section className="glass-card p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-muted">
              パッケージ名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="例: セラミックコーティング Lv2 標準"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-muted">説明</label>
            <textarea
              className="input-field"
              rows={2}
              placeholder="案件管理画面・見積書での補助説明 (任意)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted">カテゴリ</label>
            <select
              className="select-field"
              value={category}
              onChange={(e) => setCategory(e.target.value as ServicePackageCategory)}
            >
              {SERVICE_PACKAGE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {SERVICE_PACKAGE_CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted">並び順</label>
            <input
              type="number"
              className="input-field"
              min="0"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted">価格戦略</label>
            <select
              className="select-field"
              value={priceStrategy}
              onChange={(e) => setPriceStrategy(e.target.value as PriceStrategy)}
            >
              {PRICE_STRATEGIES.map((s) => (
                <option key={s} value={s}>
                  {PRICE_STRATEGY_LABEL[s]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted">
              固定価格 {priceStrategy === "fixed" && <span className="text-red-500">*</span>}
            </label>
            <input
              type="number"
              className="input-field"
              min="0"
              disabled={priceStrategy !== "fixed"}
              placeholder={priceStrategy === "fixed" ? "例: 88000" : "—"}
              value={priceStrategy === "fixed" ? fixedPrice : ""}
              onChange={(e) => setFixedPrice(e.target.value)}
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-muted">推奨レイアウトテンプレ</label>
            <select
              className="select-field"
              value={recommendedTemplateId}
              onChange={(e) => setRecommendedTemplateId(e.target.value)}
            >
              <option value="">— 指定なし —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted">
              証明書発行時にコンテンツテンプレ未指定なら、このレイアウトを自動選択します。
            </p>
          </div>
        </div>
      </section>

      <section className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold tracking-[0.18em] text-muted">明細</div>
            <div className="mt-0.5 text-base font-semibold text-primary">メニュー品目 ({items.length} 件)</div>
          </div>
          <div className="text-right text-sm">
            <div className="text-xs text-muted">明細合計</div>
            <div className="text-lg font-bold text-primary">{formatJpy(itemsTotal)}</div>
            {priceStrategy !== "sum_of_items" && (
              <div className="text-[11px] text-muted">
                {priceStrategy === "fixed" ? `適用価格: ${formatJpy(previewPrice ?? 0)}` : "適用価格: 展開時に手入力"}
              </div>
            )}
          </div>
        </div>

        {/* 品目検索 */}
        <div>
          <input
            type="search"
            className="input-field"
            placeholder="品目名で検索 (例: ガラスコーティング)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="package-menu-search"
          />
          {search.trim() && (
            <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-border-subtle">
              {filteredMenu.length === 0 ? (
                <div className="p-3 text-xs text-muted">該当する品目がありません。</div>
              ) : (
                <ul className="divide-y divide-border-subtle">
                  {filteredMenu.map((m) => {
                    const already = items.some((it) => it.menu_item_id === m.id);
                    return (
                      <li key={m.id} className="flex items-center justify-between p-2 hover:bg-surface-hover">
                        <div>
                          <div className="text-sm font-medium text-primary">{m.name}</div>
                          {m.description && <div className="text-[11px] text-muted line-clamp-1">{m.description}</div>}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-xs text-secondary whitespace-nowrap">{formatJpy(m.unit_price ?? 0)}</div>
                          <button
                            type="button"
                            className="btn-ghost px-2 py-1 text-xs"
                            disabled={already}
                            onClick={() => addItem(m.id)}
                          >
                            {already ? "追加済" : "+ 追加"}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-subtle p-6 text-center text-sm text-muted">
            まだ品目が追加されていません。上の検索ボックスから品目を追加してください。
          </div>
        ) : (
          <ul className="space-y-2" data-testid="package-items-list">
            {items.map((it, idx) => {
              const menu = menuItems.find((m) => m.id === it.menu_item_id);
              const baseUnit = menu?.unit_price ?? 0;
              const effective = it.override_unit_price ?? baseUnit;
              return (
                <li
                  key={it.key}
                  className="grid grid-cols-12 gap-2 items-center rounded-lg border border-border-subtle bg-surface p-3"
                >
                  <div className="col-span-12 sm:col-span-4">
                    <div className="text-sm font-medium text-primary">{menu?.name ?? "(削除済品目)"}</div>
                    <div className="text-[11px] text-muted">基準単価: {formatJpy(baseUnit)}</div>
                  </div>
                  <div className="col-span-4 sm:col-span-2 space-y-0.5">
                    <label className="text-[10px] text-muted">数量</label>
                    <input
                      type="number"
                      className="input-field py-1 text-sm"
                      min="0"
                      step="0.5"
                      value={it.quantity}
                      onChange={(e) => updateItem(it.key, { quantity: Number(e.target.value) })}
                    />
                  </div>
                  <div className="col-span-5 sm:col-span-3 space-y-0.5">
                    <label className="text-[10px] text-muted">単価上書き (任意)</label>
                    <input
                      type="number"
                      className="input-field py-1 text-sm"
                      min="0"
                      placeholder={String(baseUnit)}
                      value={it.override_unit_price ?? ""}
                      onChange={(e) =>
                        updateItem(it.key, {
                          override_unit_price: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2 text-right text-sm">
                    <div className="text-[10px] text-muted">小計</div>
                    <div className="font-semibold text-primary">
                      {formatJpy(Math.round(effective * (it.quantity || 0)))}
                    </div>
                  </div>
                  <div className="col-span-12 sm:col-span-1 flex items-center justify-end gap-1">
                    <button
                      type="button"
                      className="btn-ghost px-2 py-1 text-xs"
                      disabled={idx === 0}
                      onClick={() => moveItem(it.key, -1)}
                      aria-label="上に移動"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn-ghost px-2 py-1 text-xs"
                      disabled={idx === items.length - 1}
                      onClick={() => moveItem(it.key, 1)}
                      aria-label="下に移動"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="btn-danger px-2 py-1 text-xs"
                      onClick={() => removeItem(it.key)}
                      aria-label="削除"
                    >
                      ×
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="flex gap-3">
        <button type="button" className="btn-primary" disabled={saving} onClick={save} data-testid="package-save">
          {saving ? "保存中…" : isNew ? "作成" : "更新"}
        </button>
        <Link href="/admin/service-packages" className="btn-ghost">
          キャンセル
        </Link>
      </div>
    </div>
  );
}
