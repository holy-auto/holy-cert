"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import EmptyStateGuide from "@/components/ui/EmptyStateGuide";
import { formatJpy } from "@/lib/format";
import { fetcher } from "@/lib/swr";
import { parseJsonSafe } from "@/lib/api/safeJson";
import {
  SERVICE_PACKAGE_CATEGORIES,
  SERVICE_PACKAGE_CATEGORY_LABEL,
  type ServicePackageCategory,
} from "@/lib/validations/service-package";

type PackageRow = {
  id: string;
  name: string;
  description: string | null;
  category: ServicePackageCategory;
  price_strategy: "sum_of_items" | "fixed" | "manual";
  fixed_price: number | null;
  recommended_template_id: string | null;
  sort_order: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  item_count: number;
};

type ListResponse = { packages: PackageRow[] };

const PRICE_STRATEGY_LABEL: Record<PackageRow["price_strategy"], string> = {
  sum_of_items: "明細合計",
  fixed: "固定価格",
  manual: "手動",
};

export default function ServicePackagesClient() {
  const [includeArchived, setIncludeArchived] = useState(false);

  const swrKey = `/api/admin/service-packages${includeArchived ? "?include_archived=true" : ""}`;
  const { data, isLoading, error, mutate } = useSWR<ListResponse>(swrKey, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 2000,
  });

  const grouped = useMemo(() => {
    const out = new Map<ServicePackageCategory, PackageRow[]>();
    for (const cat of SERVICE_PACKAGE_CATEGORIES) out.set(cat, []);
    for (const p of data?.packages ?? []) {
      const arr = out.get(p.category) ?? [];
      arr.push(p);
      out.set(p.category, arr);
    }
    return out;
  }, [data]);

  const totalActive = (data?.packages ?? []).filter((p) => !p.is_archived).length;

  const handleArchive = async (id: string) => {
    if (!confirm("このパッケージをアーカイブしますか？案件への適用ボタンには出なくなります。")) return;
    try {
      const res = await fetch(`/api/admin/service-packages/${id}`, { method: "DELETE" });
      const j = await parseJsonSafe(res);
      if (!res.ok) throw new Error(j?.message ?? `HTTP ${res.status}`);
      await mutate();
    } catch (e: unknown) {
      alert("アーカイブに失敗しました: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/service-packages/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ is_archived: false }),
      });
      const j = await parseJsonSafe(res);
      if (!res.ok) throw new Error(j?.message ?? `HTTP ${res.status}`);
      await mutate();
    } catch (e: unknown) {
      alert("復元に失敗しました: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        tag="施工テンプレート"
        title="施工パッケージ"
        description="セラミックコーティング Lv2 標準・PPF フルボディ標準などの施工バンドル。案件・見積・証明書フォームに 1 クリックで展開できます。"
        actions={
          <Link href="/admin/service-packages/new" className="btn-primary">
            + 新規パッケージ
          </Link>
        }
      />

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-xs text-secondary">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
          />
          アーカイブ済も表示
        </label>
        <div className="text-xs text-muted">有効: {totalActive} 件</div>
      </div>

      {isLoading && <div className="text-sm text-muted">読み込み中…</div>}
      {error && (
        <div className="glass-card p-4 text-sm text-red-500">
          {error instanceof Error ? error.message : "読み込みに失敗しました"}
        </div>
      )}

      {data && (data.packages?.length ?? 0) === 0 && (
        <EmptyStateGuide
          icon="📦"
          title="最初の施工パッケージを作りましょう"
          description="よく使う施工メニューの組み合わせ (例: ガラスコーティング + 撥水コート + ヘッドライト磨き) をパッケージ化すると、案件・見積・証明書フォームへ 1 クリックで展開できます。"
          steps={[
            { title: "「+ 新規パッケージ」をクリック", description: "右上のボタンから登録ページを開きます。" },
            {
              title: "メニュー品目を組み合わせる",
              description: "既存の品目マスタから検索して数量を指定。価格戦略は明細合計 / 固定価格 / 手動から選びます。",
            },
            {
              title: "案件・証明書発行で再利用",
              description: "案件詳細ページや証明書発行画面から「パッケージから適用」できます。",
            },
          ]}
          primaryAction={{
            label: "+ 最初のパッケージを作成",
            href: "/admin/service-packages/new",
          }}
        />
      )}

      {data &&
        SERVICE_PACKAGE_CATEGORIES.map((cat) => {
          const rows = grouped.get(cat) ?? [];
          if (rows.length === 0) return null;
          return (
            <section key={cat} className="glass-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-border-subtle p-4">
                <div>
                  <div className="text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">
                    {SERVICE_PACKAGE_CATEGORY_LABEL[cat]}
                  </div>
                  <div className="mt-0.5 text-base font-semibold text-primary">
                    {SERVICE_PACKAGE_CATEGORY_LABEL[cat]} ({rows.length})
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-surface-hover">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold tracking-[0.12em] text-muted">
                        パッケージ名
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold tracking-[0.12em] text-muted">明細</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold tracking-[0.12em] text-muted">
                        価格戦略
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold tracking-[0.12em] text-muted">
                        固定価格
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold tracking-[0.12em] text-muted">
                        ステータス
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold tracking-[0.12em] text-muted">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {rows.map((p) => (
                      <tr key={p.id} className="hover:bg-surface-hover/60">
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-primary">{p.name}</div>
                          {p.description && (
                            <div className="mt-0.5 text-xs text-muted line-clamp-1">{p.description}</div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-secondary">{p.item_count} 件</td>
                        <td className="px-5 py-3.5 text-secondary">{PRICE_STRATEGY_LABEL[p.price_strategy]}</td>
                        <td className="px-5 py-3.5 text-secondary whitespace-nowrap">
                          {p.price_strategy === "fixed" ? formatJpy(p.fixed_price) : "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={p.is_archived ? "default" : "success"}>
                            {p.is_archived ? "アーカイブ" : "有効"}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex gap-2">
                            <Link href={`/admin/service-packages/${p.id}`} className="btn-ghost px-3 py-1 text-xs">
                              編集
                            </Link>
                            {p.is_archived ? (
                              <button
                                type="button"
                                className="btn-ghost px-3 py-1 text-xs"
                                onClick={() => handleRestore(p.id)}
                              >
                                復元
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn-danger px-3 py-1 text-xs"
                                onClick={() => handleArchive(p.id)}
                              >
                                アーカイブ
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
    </div>
  );
}
