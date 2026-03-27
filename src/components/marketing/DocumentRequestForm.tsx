"use client";

import { useState } from "react";

const inputClass =
  "w-full px-4 py-3 rounded-lg border border-white/[0.08] bg-white/[0.05] text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition-colors";

type RoleType = "shop" | "agent" | "insurer";

const roleLabels: Record<RoleType, string> = {
  shop: "加盟店（施工店）",
  agent: "代理店",
  insurer: "保険会社",
};

const roleCategoryDefaults: Record<RoleType, string> = {
  shop: "document_shop",
  agent: "document_agent",
  insurer: "document_insurer",
};

export function DocumentRequestForm({ role }: { role: RoleType }) {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  if (submitted) {
    return (
      <div className="text-center py-16 px-8 rounded-xl bg-white/[0.04] border border-white/[0.07]">
        <div className="w-16 h-16 mx-auto bg-blue-500/[0.1] rounded-full flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8 text-blue-400">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="mt-6 text-xl font-bold text-white">資料請求を受け付けました</h3>
        <p className="mt-3 text-white/50">
          ご登録いただいたメールアドレスに資料をお送りいたします。
          <br />
          通常1営業日以内にお届けします。
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSending(true);

    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get("name") as string,
      email: fd.get("email") as string,
      company: (fd.get("company") as string) || undefined,
      phone: (fd.get("phone") as string) || undefined,
      category: roleCategoryDefaults[role],
      message: `【${roleLabels[role]}向け資料請求】\n${(fd.get("message") as string) || "資料の送付を希望します。"}`,
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "送信に失敗しました。");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "送信に失敗しました。しばらくしてから再度お試しください。");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            お名前 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            name="name"
            required
            className={inputClass}
            placeholder="山田 太郎"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            {role === "insurer" ? "会社名" : "会社名・店舗名"} <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            name="company"
            required
            className={inputClass}
            placeholder={role === "insurer" ? "〇〇損害保険株式会社" : role === "agent" ? "株式会社〇〇" : "〇〇自動車 〇〇店"}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            メールアドレス <span className="text-red-400">*</span>
          </label>
          <input
            type="email"
            name="email"
            required
            className={inputClass}
            placeholder="example@company.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            電話番号
          </label>
          <input
            type="tel"
            name="phone"
            className={inputClass}
            placeholder="03-1234-5678"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          ご質問・ご要望
        </label>
        <textarea
          name="message"
          rows={4}
          className={`${inputClass} resize-none`}
          placeholder="具体的なご質問やご要望があればご記入ください"
        />
      </div>
      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}
      <button
        type="submit"
        disabled={sending}
        className="w-full sm:w-auto inline-flex items-center justify-center font-medium rounded-lg text-[0.938rem] px-8 py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-500 hover:to-blue-400 shadow-[0_1px_12px_rgba(59,130,246,0.3)] hover:shadow-[0_2px_20px_rgba(59,130,246,0.45)] hover:-translate-y-[0.5px] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {sending ? "送信中..." : "無料で資料を請求する"}
      </button>
      <p className="text-xs text-white/30">
        ご入力いただいた情報は資料送付およびご連絡のみに使用いたします。
      </p>
    </form>
  );
}
