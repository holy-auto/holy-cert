"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DealNotesClient({
  dealId,
  initialNotes,
}: {
  dealId: string;
  initialNotes: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/market/deals/${dealId}/notes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="border-t border-gray-100 pt-4 mt-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-gray-400">商談メモ</p>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-blue-600 hover:underline"
          >
            {notes ? "編集" : "追加"}
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="価格交渉の経緯、条件、連絡事項など"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none outline-none focus:border-blue-400"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "保存中..." : "保存"}
            </button>
            <button
              onClick={() => { setEditing(false); setNotes(initialNotes ?? ""); }}
              className="px-3 py-1.5 border border-gray-300 text-gray-600 text-xs rounded-lg hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-700 whitespace-pre-line">
          {notes || <span className="text-gray-400 italic">メモなし</span>}
        </p>
      )}
    </div>
  );
}
