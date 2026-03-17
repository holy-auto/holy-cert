"use client";

import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
type Priority = "low" | "normal" | "high" | "urgent";

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: TicketStatus;
  priority: Priority;
  created_at: string;
}

interface TicketMessage {
  id: string;
  sender_type: "tenant" | "operator";
  message: string;
  created_at: string;
}

const statusLabel = (s: TicketStatus) => {
  const m: Record<TicketStatus, string> = { open: "対応待ち", in_progress: "対応中", resolved: "解決済み", closed: "クローズ" };
  return m[s] ?? s;
};

const statusVariant = (s: TicketStatus): "info" | "warning" | "success" | "default" => {
  const m: Record<TicketStatus, "info" | "warning" | "success" | "default"> = { open: "info", in_progress: "warning", resolved: "success", closed: "default" };
  return m[s] ?? "default";
};

const priorityLabel = (p: Priority) => {
  const m: Record<Priority, string> = { low: "低", normal: "通常", high: "高", urgent: "緊急" };
  return m[p] ?? p;
};

export default function SupportTicketsClient() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);

  // New ticket form
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = useCallback(async () => {
    setErr(null);
    try {
      const res = await fetch("/api/admin/support-tickets", { cache: "no-store" });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error ?? `HTTP ${res.status}`);
      setTickets(j.tickets ?? []);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchTickets();
      setLoading(false);
    })();
  }, [fetchTickets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/support-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message, priority }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error ?? `HTTP ${res.status}`);
      setSubject("");
      setMessage("");
      setPriority("normal");
      setShowForm(false);
      await fetchTickets();
    } catch (e: unknown) {
      alert("送信に失敗しました: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setMessages([]);
      setReplyText("");
      return;
    }
    setExpandedId(id);
    setMessagesLoading(true);
    try {
      const res = await fetch(`/api/admin/support-tickets/${id}/reply`, { cache: "no-store" });
      const j = await res.json().catch(() => null);
      setMessages(j?.messages ?? []);
    } catch {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleReply = async (ticketId: string) => {
    if (!replyText.trim()) return;
    setReplySending(true);
    try {
      const res = await fetch(`/api/admin/support-tickets/${ticketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText }),
      });
      if (!res.ok) throw new Error("送信失敗");
      setReplyText("");
      const rRes = await fetch(`/api/admin/support-tickets/${ticketId}/reply`, { cache: "no-store" });
      const rJ = await rRes.json().catch(() => null);
      setMessages(rJ?.messages ?? []);
    } catch (e: unknown) {
      alert("返信に失敗しました: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setReplySending(false);
    }
  };

  if (loading) return <div className="text-sm text-muted">読み込み中...</div>;
  if (err) return <div className="glass-card p-4 text-sm text-red-500">{err}</div>;

  const inputCls = "w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400";

  return (
    <div className="space-y-4">
      {/* New ticket button */}
      <div className="flex justify-end">
        <button type="button" className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "キャンセル" : "運営に問い合わせる"}
        </button>
      </div>

      {/* New ticket form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card p-5 space-y-4">
          <div className="text-sm font-semibold text-primary">新規お問い合わせ</div>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-neutral-700">件名 <span className="text-red-500">*</span></span>
            <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="例: 請求書について" required />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-neutral-700">優先度</span>
            <select className={inputCls} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              <option value="low">低</option>
              <option value="normal">通常</option>
              <option value="high">高</option>
              <option value="urgent">緊急</option>
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-neutral-700">メッセージ <span className="text-red-500">*</span></span>
            <textarea className={inputCls + " min-h-[120px]"} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="お問い合わせ内容を入力してください" required />
          </label>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "送信中..." : "送信する"}
          </button>
        </form>
      )}

      {/* Tickets list */}
      {tickets.length === 0 && !showForm && (
        <div className="glass-card p-8 text-center text-muted">
          運営への問い合わせはありません
        </div>
      )}

      <div className="space-y-3">
        {tickets.map((t) => (
          <div key={t.id} className="glass-card overflow-hidden">
            <button
              type="button"
              className="w-full p-4 text-left hover:bg-[rgba(0,0,0,0.02)] transition-colors"
              onClick={() => toggleExpand(t.id)}
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-primary truncate">{t.subject}</div>
                  <div className="text-xs text-secondary mt-0.5 line-clamp-1">{t.message}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {t.priority !== "normal" && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      t.priority === "urgent" ? "bg-red-100 text-red-700" :
                      t.priority === "high" ? "bg-amber-100 text-amber-700" :
                      "bg-neutral-100 text-neutral-500"
                    }`}>
                      {priorityLabel(t.priority)}
                    </span>
                  )}
                  <Badge variant={statusVariant(t.status)}>
                    {statusLabel(t.status)}
                  </Badge>
                  <span className="text-xs text-muted">{formatDate(t.created_at)}</span>
                </div>
              </div>
            </button>

            {expandedId === t.id && (
              <div className="border-t border-border-subtle p-4 space-y-4">
                <div>
                  <div className="text-xs text-muted mb-1">お問い合わせ内容</div>
                  <div className="text-sm text-primary whitespace-pre-wrap">{t.message}</div>
                </div>

                <div>
                  <div className="text-xs text-muted mb-2">メッセージ</div>
                  {messagesLoading && <div className="text-xs text-muted">読み込み中...</div>}
                  {!messagesLoading && messages.length === 0 && (
                    <div className="text-xs text-muted">返信はまだありません</div>
                  )}
                  {!messagesLoading && messages.length > 0 && (
                    <div className="space-y-2">
                      {messages.map((m) => (
                        <div key={m.id} className={`rounded-lg p-3 ${
                          m.sender_type === "operator" ? "bg-blue-50 border border-blue-100" : "bg-[rgba(0,0,0,0.02)]"
                        }`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-medium ${m.sender_type === "operator" ? "text-blue-700" : "text-secondary"}`}>
                              {m.sender_type === "operator" ? "運営" : "自社"}
                            </span>
                            <span className="text-[10px] text-muted">{formatDate(m.created_at)}</span>
                          </div>
                          <div className="text-sm text-primary whitespace-pre-wrap">{m.message}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {t.status !== "closed" && (
                  <div className="space-y-2">
                    <textarea
                      className={inputCls + " min-h-[80px]"}
                      placeholder="返信を入力..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={replySending || !replyText.trim()}
                      onClick={() => handleReply(t.id)}
                    >
                      {replySending ? "送信中..." : "返信する"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
