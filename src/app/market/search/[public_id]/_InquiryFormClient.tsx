"use client";

import { useState } from "react";
import Link from "next/link";

interface Props {
  listingId: string;
  listingPublicId: string;
  existingInquiryId: string | null;
  existingInquiryStatus: string | null;
  listingStatus: string;
}

export default function InquiryFormClient({
  listingId,
  existingInquiryId,
  existingInquiryStatus,
  listingStatus,
}: Props) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canInquire = listingStatus === "active";
  const hasExisting = existingInquiryId != null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/market/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listing_id: listingId, message: message.trim() }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "送信に失敗しました");
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (!canInquire) {
    return (
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-center">
        <p className="text-sm text-gray-500">この在庫は現在問い合わせできません</p>
      </div>
    );
  }

  if (sent || hasExisting) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="text-center mb-3">
          <p className="text-sm text-green-700 font-medium">
            {sent ? "問い合わせを送信しました" : "問い合わせ済み"}
          </p>
          {existingInquiryStatus && (
            <p className="text-xs text-gray-400 mt-0.5">
              ステータス: {statusLabel(existingInquiryStatus)}
            </p>
          )}
        </div>
        {existingInquiryId && (
          <Link
            href={`/market/inquiries/${existingInquiryId}`}
            className="block w-full py-2 text-center border border-blue-300 text-blue-600 rounded-lg text-sm hover:bg-blue-50 transition-colors"
          >
            メッセージを確認する
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-3">問い合わせる</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={5}
          placeholder="この車両について詳細を教えてください..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        {error && (
          <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading || !message.trim()}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "送信中..." : "問い合わせを送る"}
        </button>
      </form>
      <p className="text-xs text-gray-400 mt-2 text-center">
        出品業者に直接メッセージが届きます
      </p>
    </div>
  );
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    open: "未返信",
    replied: "返信済み",
    closed: "クローズ",
    deal: "商談中",
  };
  return map[status] ?? status;
}
