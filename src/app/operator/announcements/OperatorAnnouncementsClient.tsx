"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";

type Category = "info" | "update" | "maintenance" | "important";

interface Announcement {
  id: string;
  title: string;
  body: string;
  category: Category;
  published: boolean;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const categoryLabel: Record<Category, string> = { info: "お知らせ", update: "アップデート", maintenance: "メンテナンス", important: "重要" };
const categoryVariant: Record<Category, "info" | "success" | "warning" | "danger"> = { info: "info", update: "success", maintenance: "warning", important: "danger" };

const inputCls = "w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400";

export default function OperatorAnnouncementsClient({ initialAnnouncements }: { initialAnnouncements: Announcement[] }) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<Category>("info");
  const [published, setPublished] = useState(true);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/operator/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, category, published }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error ?? "作成失敗");
      setAnnouncements((prev) => [j.announcement, ...prev]);
      setTitle("");
      setBody("");
      setCategory("info");
      setPublished(true);
      setShowForm(false);
    } catch (e: unknown) {
      alert("作成に失敗しました: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (id: string, currentPublished: boolean) => {
    try {
      const res = await fetch("/api/operator/announcements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, published: !currentPublished }),
      });
      if (!res.ok) throw new Error("更新失敗");
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === id ? { ...a, published: !currentPublished, published_at: !currentPublished ? new Date().toISOString() : a.published_at } : a))
      );
    } catch {
      alert("更新に失敗しました");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このお知らせを削除しますか？")) return;
    try {
      const res = await fetch("/api/operator/announcements", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("削除失敗");
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch {
      alert("削除に失敗しました");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "キャンセル" : "新規作成"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="glass-card p-5 space-y-4">
          <div className="text-sm font-semibold text-primary">新規お知らせ</div>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-neutral-700">タイトル <span className="text-red-500">*</span></span>
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-neutral-700">カテゴリ</span>
            <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              <option value="info">お知らせ</option>
              <option value="update">アップデート</option>
              <option value="maintenance">メンテナンス</option>
              <option value="important">重要</option>
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-neutral-700">本文 <span className="text-red-500">*</span></span>
            <textarea className={inputCls + " min-h-[120px]"} value={body} onChange={(e) => setBody(e.target.value)} required />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            <span className="text-sm text-neutral-700">すぐに公開する</span>
          </label>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "作成中..." : "作成する"}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {announcements.map((a) => (
          <div key={a.id} className="glass-card p-4">
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant={categoryVariant[a.category]}>{categoryLabel[a.category]}</Badge>
                <span className="text-sm font-semibold text-primary truncate">{a.title}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  a.published ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"
                }`}>
                  {a.published ? "公開中" : "非公開"}
                </span>
                <span className="text-xs text-muted">{formatDate(a.created_at)}</span>
              </div>
            </div>
            <p className="text-sm text-secondary line-clamp-2 mb-3">{a.body}</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary !text-xs"
                onClick={() => handleTogglePublish(a.id, a.published)}
              >
                {a.published ? "非公開にする" : "公開する"}
              </button>
              <button
                type="button"
                className="text-xs text-red-500 hover:text-red-700 px-2 py-1"
                onClick={() => handleDelete(a.id)}
              >
                削除
              </button>
            </div>
          </div>
        ))}
      </div>

      {announcements.length === 0 && !showForm && (
        <div className="glass-card p-8 text-center text-muted">お知らせはありません</div>
      )}
    </div>
  );
}
