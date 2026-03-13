"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Dealer } from "@/types/market";

const PREFECTURES = [
  "北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県",
  "茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県",
  "新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県",
  "静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県",
  "奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県",
  "徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県",
  "熊本県","大分県","宮崎県","鹿児島県","沖縄県",
];

export default function ProfileFormClient({ dealer }: { dealer: Dealer }) {
  const router = useRouter();
  const [form, setForm] = useState({
    company_name: dealer.company_name,
    contact_name: dealer.contact_name ?? "",
    phone: dealer.phone ?? "",
    address: dealer.address ?? "",
    prefecture: dealer.prefecture ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    const res = await fetch("/api/market/dealers/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_name: form.company_name.trim(),
        contact_name: form.contact_name.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        prefecture: form.prefecture || null,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "保存に失敗しました");
    } else {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">会社情報</h2>
        <div className="space-y-4">
          <Field label="会社名 *">
            <input
              type="text"
              value={form.company_name}
              onChange={(e) => set("company_name", e.target.value)}
              required
              className="input"
            />
          </Field>
          <Field label="担当者名">
            <input
              type="text"
              value={form.contact_name}
              onChange={(e) => set("contact_name", e.target.value)}
              placeholder="山田 太郎"
              className="input"
            />
          </Field>
          <Field label="電話番号">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="03-1234-5678"
              className="input"
            />
          </Field>
          <Field label="都道府県">
            <select
              value={form.prefecture}
              onChange={(e) => set("prefecture", e.target.value)}
              className="input"
            >
              <option value="">選択してください</option>
              {PREFECTURES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label="住所">
            <input
              type="text"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="東京都渋谷区..."
              className="input"
            />
          </Field>
        </div>
      </section>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
      )}
      {saved && (
        <p className="text-sm text-green-700 bg-green-50 px-4 py-3 rounded-xl">保存しました</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "保存中..." : "保存する"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          戻る
        </button>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input:focus { border-color: #3b82f6; }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
