"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DealerApprovalClient({
  dealerId,
  currentStatus,
}: {
  dealerId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function update(status: "approved" | "suspended") {
    setLoading(true);
    await fetch(`/api/market/admin/dealers/${dealerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2 flex-shrink-0">
      {currentStatus !== "approved" && (
        <button
          onClick={() => update("approved")}
          disabled={loading}
          className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          承認
        </button>
      )}
      {currentStatus === "approved" && (
        <button
          onClick={() => update("suspended")}
          disabled={loading}
          className="text-xs px-3 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          停止
        </button>
      )}
      {currentStatus === "suspended" && (
        <button
          onClick={() => update("approved")}
          disabled={loading}
          className="text-xs px-3 py-1.5 border border-green-300 text-green-700 rounded-lg hover:bg-green-50 disabled:opacity-50 transition-colors"
        >
          再有効化
        </button>
      )}
    </div>
  );
}
