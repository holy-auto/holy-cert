"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  dealerId: string;
  currentStatus: string;
}

export default function DealerStatusClient({ dealerId, currentStatus }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function update(status: string) {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: err } = await supabase
      .from("dealers")
      .update({ status })
      .eq("id", dealerId);

    if (err) {
      setError(err.message);
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-sm font-semibold text-gray-900 mb-3">ステータス変更</p>
      <div className="flex gap-2 flex-wrap">
        {currentStatus !== "approved" && (
          <button
            onClick={() => update("approved")}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            承認する
          </button>
        )}
        {currentStatus !== "suspended" && (
          <button
            onClick={() => update("suspended")}
            disabled={loading}
            className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            停止する
          </button>
        )}
        {currentStatus === "suspended" && (
          <button
            onClick={() => update("approved")}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            停止を解除する
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
