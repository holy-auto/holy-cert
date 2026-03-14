"use client";

import { useState } from "react";
import Link from "next/link";

const PREFECTURES = [
  "北海道","青森","岩手","宮城","秋田","山形","福島",
  "茨城","栃木","群馬","埼玉","千葉","東京","神奈川",
  "新潟","富山","石川","福井","山梨","長野","岐阜",
  "静岡","愛知","三重","滋賀","京都","大阪","兵庫",
  "奈良","和歌山","鳥取","島根","岡山","広島","山口",
  "徳島","香川","愛媛","高知","福岡","佐賀","長崎",
  "熊本","大分","宮崎","鹿児島","沖縄",
];

export default function InviteDealerPage() {
  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    phone: "",
    address: "",
    prefecture: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ invite_code: string; dealer: any } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/market/dealers/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "招待に失敗しました");
      setLoading(false);
      return;
    }

    setResult(data);
    setLoading(false);
  }

  if (result) {
    const registerUrl = `${window.location.origin}/market/register`;
    return (
      <div className="p-6 max-w-2xl">
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-green-800 mb-2">招待コードを発行しました</h2>
          <p className="text-sm text-green-700 mb-4">
            以下の情報を{result.dealer.company_name}様にお伝えください。
          </p>

          <div className="bg-white rounded-xl border border-green-200 p-4 space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">招待コード</p>
              <p className="text-3xl font-mono font-bold text-gray-900 tracking-widest">
                {result.invite_code}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">登録URL</p>
              <p className="text-sm text-blue-600 font-mono break-all">{registerUrl}</p>
            </div>
          </div>

          <p className="text-xs text-green-600 mt-3">
            ※ このコードは一度使用すると無効になります
          </p>
        </div>

        <div className="mt-4 flex gap-3">
          <Link
            href="/admin/market/dealers"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            業者一覧へ
          </Link>
          <button
            onClick={() => { setResult(null); setForm({ company_name: "", contact_name: "", phone: "", address: "", prefecture: "" }); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            別の業者を招待
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">業者を招待する</h1>
        <p className="text-sm text-gray-500 mt-1">招待コードを発行してHolyMarketに参加させる</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-xl border border-gray-200 p-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            会社名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.company_name}
            onChange={(e) => set("company_name", e.target.value)}
            required
            placeholder="株式会社〇〇オート"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">担当者名</label>
            <input
              type="text"
              value={form.contact_name}
              onChange={(e) => set("contact_name", e.target.value)}
              placeholder="山田 太郎"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="03-1234-5678"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">都道府県</label>
            <select
              value={form.prefecture}
              onChange={(e) => set("prefecture", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">選択してください</option>
              {PREFECTURES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">住所</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="東京都渋谷区..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "発行中..." : "招待コードを発行"}
          </button>
          <Link
            href="/admin/market/dealers"
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  );
}
