"use client";

import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import { formatJpy } from "@/lib/format";
import {
  SERVICE_PACKAGE_CATEGORY_LABEL,
  type ServicePackageCategory,
  type PriceStrategy,
} from "@/lib/validations/service-package";

type PackageRow = {
  id: string;
  name: string;
  category: ServicePackageCategory;
  price_strategy: PriceStrategy;
  is_archived: boolean;
  quantity: number;
  override_unit_price: number | null;
};

/**
 * 品目マスタ画面で「このメニューを使うパッケージ」を表示する逆引きパネル。
 * lazy-fetch で開いたときにだけ /api/admin/menu-items/:id/packages を呼ぶ。
 */
export default function MenuItemPackagesPanel({ menuItemId }: { menuItemId: string }) {
  const { data, isLoading, error } = useSWR<{ packages: PackageRow[] }>(
    `/api/admin/menu-items/${menuItemId}/packages`,
    fetcher,
    { revalidateOnFocus: false },
  );

  if (isLoading) return <div className="text-xs text-muted">読み込み中…</div>;
  if (error)
    return (
      <div className="text-xs text-danger">
        読み込みに失敗しました: {error instanceof Error ? error.message : String(error)}
      </div>
    );
  if (!data) return null;
  const packages = data.packages ?? [];
  if (packages.length === 0) {
    return (
      <div className="text-xs text-muted">
        この品目を使っている施工パッケージはありません。
        <Link href="/admin/service-packages/new" className="ml-1 text-accent hover:underline">
          新規作成 →
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-1" data-testid={`menu-item-packages-${menuItemId}`}>
      {packages.map((p) => (
        <li
          key={p.id}
          className="flex items-center justify-between gap-2 rounded-lg border border-border-subtle bg-surface px-3 py-2 text-xs"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/admin/service-packages/${p.id}`} className="font-medium text-primary hover:underline">
                {p.name}
              </Link>
              <span className="rounded bg-inset px-1.5 py-0.5 text-[10px] text-secondary">
                {SERVICE_PACKAGE_CATEGORY_LABEL[p.category]}
              </span>
              {p.is_archived && (
                <span className="rounded bg-warning-dim px-1.5 py-0.5 text-[10px] text-warning-text">アーカイブ</span>
              )}
            </div>
            <div className="mt-0.5 text-[11px] text-muted">
              数量 {p.quantity}
              {p.override_unit_price != null ? ` / 単価上書き ${formatJpy(p.override_unit_price)}` : ""}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
