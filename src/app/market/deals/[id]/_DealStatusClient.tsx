"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  dealId: string;
  currentStatus: string;
  isSeller: boolean;
}

export default function DealStatusClient({ dealId, currentStatus, isSeller }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function update(status: "agreed" | "completed" | "cancelled") {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/market/deals/${dealId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "更新に失敗しました");
      setLoading(false);
      return;
    }

    router.refresh();
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-sm font-semibold text-gray-900 mb-3">商談ステータスを更新</p>
      <div className="flex flex-wrap gap-2">
        {currentStatus === "negotiating" && isSeller && (
          <button
            onClick={() => update("agreed")}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            合意済みにする
          </button>
        )}
        {currentStatus === "agreed" && (
          <button
            onClick={() => update("completed")}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            取引完了
          </button>
        )}
        <button
          onClick={() => update("cancelled")}
          disabled={loading}
          className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          キャンセル
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
