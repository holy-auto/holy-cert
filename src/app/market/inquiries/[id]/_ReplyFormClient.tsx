"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  inquiryId: string;
}

export default function ReplyFormClient({ inquiryId }: Props) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/market/inquiries/${inquiryId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.trim() }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "送信に失敗しました");
      setLoading(false);
      return;
    }

    setMessage("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 p-3">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={2}
        placeholder="メッセージを入力..."
        className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e as unknown as React.FormEvent);
          }
        }}
      />
      <button
        type="submit"
        disabled={loading || !message.trim()}
        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors h-[60px]"
      >
        {loading ? "..." : "送信"}
      </button>
      {error && <p className="absolute text-xs text-red-600">{error}</p>}
    </form>
  );
}
