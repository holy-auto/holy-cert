"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { fetcher } from "@/lib/swr";
import { parseJsonSafe } from "@/lib/api/safeJson";
import { formatJpy } from "@/lib/format";
import { appendMenuItemsWithDedup } from "@/lib/service-packages/expand";
import {
  SERVICE_PACKAGE_CATEGORIES,
  SERVICE_PACKAGE_CATEGORY_LABEL,
  type ServicePackageCategory,
  type PriceStrategy,
} from "@/lib/validations/service-package";
import type { MenuItem } from "./types";

type PackageRow = {
  id: string;
  name: string;
  description: string | null;
  category: ServicePackageCategory;
  price_strategy: PriceStrategy;
  fixed_price: number | null;
  is_archived: boolean;
  item_count: number;
};

type ListResponse = { packages: PackageRow[] };

type ExpandResponse = {
  package: { id: string; name: string };
  items: Array<{
    menu_item_id: string;
    name: string;
    unit_price: number;
    quantity: number;
    line_total: number;
  }>;
  items_total: number;
  price: number | null;
};

type Props = {
  reservationId: string;
  existingMenuItems: MenuItem[];
  existingEstimate: number | null;
  /** Optional callback after a successful apply, otherwise we router.refresh(). */
  onApplied?: () => void;
};

export default function JobPackageApply({ reservationId, existingMenuItems, existingEstimate, onApplied }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [preview, setPreview] = useState<ExpandResponse | null>(null);
  const [updateEstimate, setUpdateEstimate] = useState(true);

  const { data, isLoading, error } = useSWR<ListResponse>(open ? "/api/admin/service-packages" : null, fetcher, {
    revalidateOnFocus: false,
  });

  const reset = () => {
    setOpen(false);
    setPreview(null);
    setMsg(null);
    setUpdateEstimate(true);
  };

  const loadPreview = async (pkgId: string) => {
    setMsg(null);
    setPreview(null);
    try {
      const res = await fetch(`/api/admin/service-packages/${pkgId}/expand`);
      const j = await parseJsonSafe(res);
      if (!res.ok) throw new Error(j?.message ?? `HTTP ${res.status}`);
      setPreview(j as ExpandResponse);
    } catch (e: unknown) {
      setMsg({ text: e instanceof Error ? e.message : String(e), ok: false });
    }
  };

  const apply = async () => {
    if (!preview) return;
    setApplying(true);
    setMsg(null);
    try {
      const additions = preview.items.map((it) => ({
        menu_item_id: it.menu_item_id,
        name: it.name,
        price: it.line_total,
      }));
      const merged = appendMenuItemsWithDedup<MenuItem>(existingMenuItems, additions);

      const payload: Record<string, unknown> = {
        id: reservationId,
        menu_items_json: merged,
      };

      if (updateEstimate && preview.price != null) {
        payload.estimated_amount = (existingEstimate ?? 0) + preview.price;
      }

      const res = await fetch("/api/admin/reservations", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await parseJsonSafe(res);
      if (!res.ok) throw new Error(j?.message ?? `HTTP ${res.status}`);

      setMsg({ text: `「${preview.package.name}」を案件に適用しました。`, ok: true });
      setPreview(null);
      if (onApplied) onApplied();
      else router.refresh();
    } catch (e: unknown) {
      setMsg({ text: e instanceof Error ? e.message : String(e), ok: false });
    } finally {
      setApplying(false);
    }
  };

  const groupedPackages = (data?.packages ?? []).reduce((acc, p) => {
    if (p.is_archived) return acc;
    const arr = acc.get(p.category) ?? [];
    arr.push(p);
    acc.set(p.category, arr);
    return acc;
  }, new Map<ServicePackageCategory, PackageRow[]>());

  return (
    <>
      <button
        type="button"
        className="btn-ghost px-3 py-1 text-xs"
        onClick={() => setOpen(true)}
        data-testid="job-apply-package-trigger"
      >
        + パッケージから適用
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" role="dialog">
          <div className="glass-card max-h-[85vh] w-full max-w-2xl overflow-y-auto p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">施工パッケージ</div>
                <div className="mt-0.5 text-base font-semibold text-primary">パッケージから適用</div>
              </div>
              <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={reset}>
                ✕
              </button>
            </div>

            {msg && (
              <div
                className={`text-sm ${msg.ok ? "text-success" : "text-danger"}`}
                data-testid="job-apply-package-message"
              >
                {msg.text}
              </div>
            )}

            {isLoading && <div className="text-xs text-muted">読み込み中…</div>}
            {error && (
              <div className="text-sm text-red-500">
                読み込みに失敗しました: {error instanceof Error ? error.message : String(error)}
              </div>
            )}

            {data && (data.packages?.length ?? 0) === 0 && (
              <div className="rounded-lg border border-dashed border-border-subtle p-6 text-center text-sm text-muted">
                利用可能なパッケージがありません。
                <Link href="/admin/service-packages/new" className="ml-1 text-accent hover:underline">
                  新規作成 →
                </Link>
              </div>
            )}

            {!preview &&
              SERVICE_PACKAGE_CATEGORIES.map((cat) => {
                const rows = groupedPackages.get(cat) ?? [];
                if (rows.length === 0) return null;
                return (
                  <section key={cat} className="space-y-1">
                    <div className="text-[11px] font-semibold tracking-[0.18em] text-muted">
                      {SERVICE_PACKAGE_CATEGORY_LABEL[cat]}
                    </div>
                    <ul className="divide-y divide-border-subtle rounded-lg border border-border-subtle">
                      {rows.map((p) => (
                        <li key={p.id} className="flex items-center justify-between p-3">
                          <div>
                            <div className="text-sm font-medium text-primary">{p.name}</div>
                            <div className="text-[11px] text-muted">
                              {p.item_count} 品目
                              {p.price_strategy === "fixed" && p.fixed_price != null
                                ? ` / 固定 ${formatJpy(p.fixed_price)}`
                                : p.price_strategy === "manual"
                                  ? " / 手動"
                                  : " / 明細合計"}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn-ghost px-3 py-1 text-xs"
                            onClick={() => loadPreview(p.id)}
                            data-testid={`job-apply-package-pick-${p.id}`}
                          >
                            選択
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}

            {preview && (
              <section className="space-y-3" data-testid="job-apply-package-preview">
                <div className="rounded-lg border border-border-subtle p-3">
                  <div className="text-xs text-muted">パッケージ</div>
                  <div className="text-base font-semibold text-primary">{preview.package.name}</div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold tracking-[0.18em] text-muted">追加される品目</div>
                  <ul className="mt-1 divide-y divide-border-subtle rounded-lg border border-border-subtle">
                    {preview.items.length === 0 ? (
                      <li className="p-3 text-xs text-muted">展開できる品目がありません。</li>
                    ) : (
                      preview.items.map((it) => {
                        const dup = existingMenuItems.some((m) => m.menu_item_id === it.menu_item_id);
                        return (
                          <li key={it.menu_item_id} className="flex items-center justify-between p-3 text-sm">
                            <div>
                              <div className="font-medium text-primary">{it.name}</div>
                              <div className="text-[11px] text-muted">
                                {it.quantity} × {formatJpy(it.unit_price)}
                                {dup && (
                                  <span className="ml-2 rounded bg-warning-dim px-1.5 py-0.5 text-[10px] text-warning-text">
                                    既に追加済 (スキップ)
                                  </span>
                                )}
                              </div>
                            </div>
                            <div
                              className={`whitespace-nowrap text-sm ${dup ? "text-muted line-through" : "text-primary"}`}
                            >
                              {formatJpy(it.line_total)}
                            </div>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>

                <div className="rounded-lg bg-inset p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-secondary">追加される明細合計</div>
                    <div className="font-semibold text-primary">{formatJpy(preview.items_total)}</div>
                  </div>
                  {preview.price != null && (
                    <label className="mt-2 flex items-center gap-2 text-xs text-secondary">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={updateEstimate}
                        onChange={(e) => setUpdateEstimate(e.target.checked)}
                      />
                      概算金額 (現在 {formatJpy(existingEstimate)}) に {formatJpy(preview.price)} を加算する
                    </label>
                  )}
                  {preview.price == null && (
                    <div className="mt-2 text-xs text-muted">価格戦略が「手動」のため、概算金額は変更しません。</div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={applying}
                    onClick={apply}
                    data-testid="job-apply-package-confirm"
                  >
                    {applying ? "適用中…" : "適用"}
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => setPreview(null)}>
                    別のパッケージを選ぶ
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </>
  );
}
