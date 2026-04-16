"use client";

import Link from "next/link";
import useSWR from "swr";
import BigActionButton from "@/components/pos/BigActionButton";
import POSSection from "@/components/pos/POSSection";
import { fetcher } from "@/lib/swr";
import { formatDate, formatJpy } from "@/lib/format";

/**
 * StorefrontCertificates
 * ------------------------------------------------------------
 * 店頭モードの証明書一覧。
 *
 *  ① 巨大ボタン: 新規発行 / 一覧を検索
 *  ② 最近発行した証明書カード (大きめタップ領域で開ける)
 */

type Certificate = {
  id: string;
  public_id: string;
  status: string;
  customer_name: string | null;
  service_price?: number | null;
  created_at: string;
};

type ApiResponse = { certificates: Certificate[] };

const STATUS_LABEL: Record<string, string> = {
  active: "有効",
  void: "無効",
  draft: "下書き",
  expired: "期限切れ",
};

const STATUS_TONE: Record<string, string> = {
  active: "bg-success-dim text-success-text",
  void: "bg-danger-dim text-danger-text",
  draft: "bg-inset text-secondary",
  expired: "bg-warning-dim text-warning-text",
};

export default function StorefrontCertificates() {
  const { data, isLoading } = useSWR<ApiResponse>("/api/admin/certificates?per_page=12", fetcher, {
    refreshInterval: 60_000,
  });

  const rows = data?.certificates ?? [];

  return (
    <div className="space-y-6">
      {/* ─── ① 大型ボタン ─── */}
      <POSSection title="施工証明書" description="発行・検索をワンタップで">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <BigActionButton
            tone="primary"
            href="/admin/certificates/new"
            title="新規発行"
            subtitle="施工証明書を今すぐ作成"
            icon={
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            }
          />
          <BigActionButton
            tone="neutral"
            href="/admin/certificates"
            title="一覧で検索"
            subtitle="ID・お客様名で探す"
            hint="管理モードに切り替えて詳細検索"
            icon={
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
            }
          />
        </div>
      </POSSection>

      {/* ─── ② 最近発行した証明書 ─── */}
      <POSSection title="最近発行した証明書" description="タップで詳細を開きます" compact>
        {isLoading && rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-subtle bg-surface/40 p-6 text-center text-sm text-muted">
            読み込み中...
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-subtle bg-surface/40 p-6 text-center text-sm text-muted">
            まだ証明書は発行されていません
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {rows.slice(0, 12).map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/certificates/${c.public_id}`}
                  className="flex h-full flex-col rounded-2xl border border-border-subtle bg-surface p-3 transition-colors hover:bg-surface-hover"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[12px] font-semibold text-accent">{c.public_id}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_TONE[c.status] ?? "bg-inset text-secondary"}`}
                    >
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  </div>
                  <div className="mt-1.5 text-sm font-bold text-primary">{c.customer_name ?? "(顧客未設定)"}</div>
                  <div className="mt-auto flex items-center justify-between pt-1.5 text-[11px] text-muted">
                    <span>{formatDate(c.created_at)}</span>
                    {c.service_price != null && (
                      <span className="font-medium text-secondary">{formatJpy(c.service_price)}</span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </POSSection>
    </div>
  );
}
