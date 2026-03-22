"use client";

import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";

const CATEGORIES = [
  { value: "technical", label: "技術的なご質問" },
  { value: "billing", label: "請求・プランについて" },
  { value: "feature", label: "機能のご要望" },
  { value: "bug", label: "不具合のご報告" },
  { value: "other", label: "その他" },
];

export default function AdminSupportPage() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get("name") as string,
      email: fd.get("email") as string,
      company: fd.get("company") as string,
      category: `管理画面: ${fd.get("category") as string}`,
      message: fd.get("message") as string,
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "送信に失敗しました");
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-6">
        <PageHeader tag="サポート" title="お問い合わせ" description="運営チームへのお問い合わせ" />
        <div className="glass-card p-8 text-center space-y-4">
          <div className="flex justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-dim">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-success">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </span>
          </div>
          <h2 className="text-lg font-semibold text-primary">お問い合わせを受け付けました</h2>
          <p className="text-sm text-secondary">
            通常1〜2営業日以内にご返信いたします。<br />
            お急ぎの場合は <a href="mailto:info@cartrust.co.jp" className="text-accent hover:underline">info@cartrust.co.jp</a> までご連絡ください。
          </p>
          <button onClick={() => setSent(false)} className="btn-secondary mt-4">
            新しいお問い合わせ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader tag="サポート" title="お問い合わせ" description="運営チームへのお問い合わせ" />

      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5 max-w-2xl">
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium text-primary">お名前 <span className="text-danger">*</span></label>
          <input id="name" name="name" required className="input-field" placeholder="山田 太郎" />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-primary">メールアドレス <span className="text-danger">*</span></label>
          <input id="email" name="email" type="email" required className="input-field" placeholder="taro@example.com" />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="company" className="text-sm font-medium text-primary">会社名 / 店舗名</label>
          <input id="company" name="company" className="input-field" placeholder="株式会社○○" />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="category" className="text-sm font-medium text-primary">お問い合わせ種別 <span className="text-danger">*</span></label>
          <select id="category" name="category" required className="select-field">
            <option value="">選択してください</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.label}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="message" className="text-sm font-medium text-primary">お問い合わせ内容 <span className="text-danger">*</span></label>
          <textarea
            id="message"
            name="message"
            required
            rows={6}
            className="input-field resize-y"
            placeholder="お問い合わせ内容をご記入ください"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-danger-dim border border-danger/20 p-3 text-sm text-danger">
            {error}
          </div>
        )}

        <button type="submit" disabled={sending} className="btn-primary">
          {sending ? "送信中..." : "送信する"}
        </button>
      </form>
    </div>
  );
}
