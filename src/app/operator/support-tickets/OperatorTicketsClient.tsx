"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

interface Ticket {
  id: string;
  tenant_name: string;
  subject: string;
  message: string;
  status: TicketStatus;
  priority: string;
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

export default function OperatorTicketsClient({ initialTickets }: { initialTickets: Ticket[] }) {
  const [tickets, setTickets] = useState(initialTickets);
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const filtered = statusFilter === "all" ? tickets : tickets.filter((t) => t.status === statusFilter);

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
      const res = await fetch(`/api/operator/support-tickets/${id}/reply`, { cache: "no-store" });
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
      const res = await fetch(`/api/operator/support-tickets/${ticketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText }),
      });
      if (!res.ok) throw new Error("送信失敗");
      setReplyText("");
      const rRes = await fetch(`/api/operator/support-tickets/${ticketId}/reply`, { cache: "no-store" });
      const rJ = await rRes.json().catch(() => null);
      setMessages(rJ?.messages ?? []);
    } catch {
      alert("返信に失敗しました");
    } finally {
      setReplySending(false);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/operator/support-tickets/${ticketId}/reply`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("更新失敗");
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus as TicketStatus } : t))
      );
    } catch {
      alert("ステータス更新に失敗しました");
    } finally {
      setStatusUpdating(false);
    }
  };

  const inputCls = "w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400";

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="glass-card p-4">
        <div className="flex gap-2 flex-wrap">
          {[
            { value: "all", label: "すべて" },
            { value: "open", label: "対応待ち" },
            { value: "in_progress", label: "対応中" },
            { value: "resolved", label: "解決済み" },
            { value: "closed", label: "クローズ" },
          ].map((o) => (
            <button
              key={o.value}
              type="button"
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === o.value
                  ? "bg-[rgba(227,0,43,0.1)] text-[#e3002b]"
                  : "text-[#6e6e73] hover:bg-[rgba(0,0,0,0.04)]"
              }`}
              onClick={() => setStatusFilter(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="text-sm text-muted">{filtered.length} 件</div>

      {/* Tickets */}
      <div className="space-y-3">
        {filtered.map((t) => (
          <div key={t.id} className="glass-card overflow-hidden">
            <button
              type="button"
              className="w-full p-4 text-left hover:bg-[rgba(0,0,0,0.02)] transition-colors"
              onClick={() => toggleExpand(t.id)}
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-primary truncate">{t.subject}</div>
                  <div className="text-xs text-secondary mt-0.5">{t.tenant_name}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {t.priority !== "normal" && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      t.priority === "urgent" ? "bg-red-100 text-red-700" :
                      t.priority === "high" ? "bg-amber-100 text-amber-700" :
                      "bg-neutral-100 text-neutral-500"
                    }`}>
                      {t.priority === "urgent" ? "緊急" : t.priority === "high" ? "高" : "低"}
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
                  <div className="text-xs text-muted mb-1">問い合わせ内容</div>
                  <div className="text-sm text-primary whitespace-pre-wrap">{t.message}</div>
                </div>

                {/* Status update */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">ステータス変更:</span>
                  <select
                    className="text-xs rounded-lg border border-neutral-300 bg-white px-2 py-1"
                    value={t.status}
                    disabled={statusUpdating}
                    onChange={(e) => handleStatusChange(t.id, e.target.value)}
                  >
                    <option value="open">対応待ち</option>
                    <option value="in_progress">対応中</option>
                    <option value="resolved">解決済み</option>
                    <option value="closed">クローズ</option>
                  </select>
                </div>

                {/* Messages */}
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
                          m.sender_type === "operator" ? "bg-red-50 border border-red-100" : "bg-[rgba(0,0,0,0.02)]"
                        }`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-medium ${m.sender_type === "operator" ? "text-red-700" : "text-secondary"}`}>
                              {m.sender_type === "operator" ? "運営" : "テナント"}
                            </span>
                            <span className="text-[10px] text-muted">{formatDate(m.created_at)}</span>
                          </div>
                          <div className="text-sm text-primary whitespace-pre-wrap">{m.message}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reply */}
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
                    {replySending ? "送信中..." : "返信する（運営として）"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="glass-card p-8 text-center text-muted">該当する問い合わせはありません</div>
      )}
    </div>
  );
}
