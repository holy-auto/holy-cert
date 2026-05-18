"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import BigActionButton from "@/components/pos/BigActionButton";
import POSSection from "@/components/pos/POSSection";
import { fetcher } from "@/lib/swr";
import { parseJsonSafe } from "@/lib/api/safeJson";
import { formatDate } from "@/lib/format";

/**
 * StorefrontCustomers
 * ------------------------------------------------------------
 * 店頭モードの顧客管理。
 *
 *  ① 検索バー (名前・電話で即時フィルタ)
 *  ② 巨大ボタン: 新規顧客登録 (その場でモーダル入力) / 管理モードで詳細検索
 *  ③ 顧客カード (大きめ・電話タップで発信)
 *
 * 新規登録は管理モードに遷移せず、店頭モードのまま大きな入力モーダルで
 * 完結させる (StorefrontInventory と同じ入力体験)。
 */

type Customer = {
  id: string;
  name: string;
  name_kana: string | null;
  email: string | null;
  phone: string | null;
  certificates_count: number;
  invoices_count: number;
  created_at: string;
};

type Stats = { total: number; this_month_new: number; linked_certificates: number };
type ApiResponse = { customers: Customer[]; stats: Stats };

const emptyForm = {
  name: "",
  name_kana: "",
  email: "",
  phone: "",
  postal_code: "",
  address: "",
  note: "",
};

export default function StorefrontCustomers() {
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  const swrKey = activeSearch
    ? `/api/admin/customers?page=1&per_page=24&q=${encodeURIComponent(activeSearch)}`
    : `/api/admin/customers?page=1&per_page=24`;

  const { data, isLoading, mutate } = useSWR<ApiResponse>(swrKey, fetcher, {
    revalidateOnFocus: true,
    keepPreviousData: true,
  });

  const customers = data?.customers ?? [];
  const stats = data?.stats;

  /* ---------- 新規登録モーダル ---------- */
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);

  const openNew = () => {
    setForm({ ...emptyForm });
    setFormErr(null);
    setShowNew(true);
  };

  const closeNew = () => {
    setShowNew(false);
    setForm({ ...emptyForm });
    setFormErr(null);
  };

  const handleCreate = async () => {
    if (!form.name.trim() || saving) return;
    setSaving(true);
    setFormErr(null);
    try {
      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await parseJsonSafe(res);
      if (!res.ok) throw new Error(j?.message ?? j?.error ?? `HTTP ${res.status}`);
      closeNew();
      setToast({ text: `${form.name.trim()} を登録しました`, ok: true });
      window.setTimeout(() => setToast(null), 3000);
      mutate();
    } catch (e: unknown) {
      setFormErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── サマリ + 検索 ─── */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-surface p-4">
        <dl className="flex flex-wrap items-baseline gap-4">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">登録顧客</dt>
            <dd className="text-xl font-bold text-primary">{stats?.total ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">今月新規</dt>
            <dd className="text-xl font-bold text-accent">{stats?.this_month_new ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">証明書紐付</dt>
            <dd className="text-xl font-bold text-success">{stats?.linked_certificates ?? "—"}</dd>
          </div>
        </dl>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setActiveSearch(search.trim());
          }}
        >
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="お客様名・電話番号"
            className="rounded-full border border-border-subtle bg-inset px-3 py-1.5 text-sm text-primary placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
            検索
          </button>
          {activeSearch && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setActiveSearch("");
              }}
              className="text-[11px] text-muted hover:text-primary"
            >
              クリア
            </button>
          )}
        </form>
      </section>

      {/* ─── 大型ボタン ─── */}
      <POSSection title="顧客管理" description="よく使う操作をワンタップで">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <BigActionButton
            tone="primary"
            onClick={openNew}
            title="新規顧客を登録"
            subtitle="お客様情報を新しく追加"
            icon={
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z"
                />
              </svg>
            }
          />
          <BigActionButton
            tone="neutral"
            href="/admin/customers"
            title="詳細検索・編集"
            subtitle="管理モードに切り替えます"
            hint="高度な一覧/編集は管理モードで"
            icon={
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
                />
              </svg>
            }
          />
        </div>
      </POSSection>

      {toast && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
            toast.ok
              ? "border-success/30 bg-success-dim text-success-text"
              : "border-danger/30 bg-danger-dim text-danger-text"
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* ─── 顧客カード ─── */}
      <POSSection title={activeSearch ? `検索結果 (${customers.length}件)` : "最近のお客様"} compact>
        {isLoading && customers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-subtle bg-surface/40 p-6 text-center text-sm text-muted">
            読み込み中...
          </div>
        ) : customers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-subtle bg-surface/40 p-6 text-center text-sm text-muted">
            {activeSearch ? "該当するお客様は見つかりませんでした" : "まだ顧客は登録されていません"}
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {customers.map((c) => (
              <li
                key={c.id}
                className="flex flex-col rounded-2xl border border-border-subtle bg-surface p-3 transition-colors hover:bg-surface-hover"
              >
                <Link href={`/admin/customers/${c.id}`} className="block">
                  <div className="text-base font-bold text-primary">{c.name}</div>
                  {c.name_kana && <div className="text-[11px] text-muted">{c.name_kana}</div>}
                </Link>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  {c.phone && (
                    <a
                      href={`tel:${c.phone}`}
                      className="inline-flex items-center gap-1 rounded-full bg-accent-dim px-2 py-0.5 font-semibold text-accent-text hover:brightness-105"
                    >
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.105c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
                        />
                      </svg>
                      {c.phone}
                    </a>
                  )}
                  {c.email && (
                    <span className="truncate rounded-full bg-inset px-2 py-0.5 text-secondary">{c.email}</span>
                  )}
                </div>
                <div className="mt-auto flex items-center justify-between pt-2 text-[11px] text-muted">
                  <span>登録: {formatDate(c.created_at)}</span>
                  <span>
                    証明書 {c.certificates_count} / 請求 {c.invoices_count}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </POSSection>

      {/* ─── 新規登録モーダル ─── */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full space-y-4 overflow-y-auto rounded-t-3xl border border-border-subtle bg-surface p-5 sm:max-w-lg sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">新規登録</div>
                <div className="mt-1 text-lg font-bold text-primary">新規顧客登録</div>
              </div>
              <button
                type="button"
                onClick={closeNew}
                disabled={saving}
                className="text-sm text-muted hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="閉じる"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-muted">
                  お客様名 <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-border-subtle bg-inset px-3 py-3 text-base text-primary placeholder:text-muted focus:border-accent focus:outline-none"
                  placeholder="山田 太郎"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted">フリガナ</label>
                  <input
                    type="text"
                    value={form.name_kana}
                    onChange={(e) => setForm({ ...form, name_kana: e.target.value })}
                    className="w-full rounded-xl border border-border-subtle bg-inset px-3 py-3 text-base text-primary placeholder:text-muted focus:border-accent focus:outline-none"
                    placeholder="ヤマダ タロウ"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted">電話番号</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full rounded-xl border border-border-subtle bg-inset px-3 py-3 text-base text-primary placeholder:text-muted focus:border-accent focus:outline-none"
                    placeholder="090-1234-5678"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted">メールアドレス</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-xl border border-border-subtle bg-inset px-3 py-3 text-base text-primary placeholder:text-muted focus:border-accent focus:outline-none"
                    placeholder="example@email.com"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted">郵便番号</label>
                  <input
                    type="text"
                    value={form.postal_code}
                    onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                    className="w-full rounded-xl border border-border-subtle bg-inset px-3 py-3 text-base text-primary placeholder:text-muted focus:border-accent focus:outline-none"
                    placeholder="123-4567"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted">住所</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full rounded-xl border border-border-subtle bg-inset px-3 py-3 text-base text-primary placeholder:text-muted focus:border-accent focus:outline-none"
                  placeholder="東京都渋谷区..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted">備考</label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="w-full rounded-xl border border-border-subtle bg-inset px-3 py-2 text-sm text-primary placeholder:text-muted focus:border-accent focus:outline-none"
                  rows={2}
                />
              </div>
            </div>

            {formErr && (
              <div className="rounded-lg border border-danger/20 bg-danger-dim px-3 py-2 text-xs text-danger-text">
                {formErr}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={closeNew}
                disabled={saving}
                className="flex-1 rounded-xl border border-border-subtle bg-inset px-3 py-3 text-sm font-semibold text-secondary hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving || !form.name.trim()}
                className="flex-[2] rounded-xl bg-accent px-3 py-3 text-base font-bold text-white transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "登録中..." : "この内容で登録"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
