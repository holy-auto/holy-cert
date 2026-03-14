"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  inquiryId: string;
  listingId: string;
}

export default function DealButtonClient({ inquiryId, listingId }: Props) {
  const [loading, setLoading] = useState(false);
  const [agreedPrice, setAgreedPrice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleStartDeal() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/market/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listing_id: listingId,
        inquiry_id: inquiryId,
        agreed_price: agreedPrice ? Math.round(Number(agreedPrice) * 10000) : undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "商談開始に失敗しました");
      setLoading(false);
      return;
    }

    router.push(`/market/deals/${data.deal.id}`);
    router.refresh();
  }

  if (!showForm) {
    return (
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-800">この問い合わせで商談を開始しますか？</p>
          <p className="text-xs text-amber-600 mt-0.5">在庫のステータスが「商談中」になります</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
        >
          商談開始
        </button>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 space-y-3">
      <p className="text-sm font-semibold text-amber-800">商談を開始する</p>
      <div>
        <label className="block text-xs font-medium text-amber-700 mb-1">
          合意価格（万円）<span className="text-amber-400 ml-1">任意</span>
        </label>
        <input
          type="number"
          value={agreedPrice}
          onChange={(e) => setAgreedPrice(e.target.value)}
          placeholder="例: 150"
          min={0}
          className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleStartDeal}
          disabled={loading}
          className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors"
        >
          {loading ? "処理中..." : "商談を開始する"}
        </button>
        <button
          onClick={() => setShowForm(false)}
          className="px-4 py-2 border border-amber-300 text-amber-700 rounded-lg text-sm hover:bg-amber-100 transition-colors"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
