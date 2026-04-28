"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Lesson {
  id: string;
  tenant_id: string | null;
  category: string;
  level: "intro" | "basic" | "standard" | "pro";
  difficulty: number;
  title: string;
  summary: string | null;
  cover_image_url: string | null;
  tags: string[];
  status: "draft" | "published" | "archived";
  view_count: number;
  rating_avg: number;
  rating_count: number;
  created_at: string;
}

const CATEGORIES = [
  { value: "", label: "すべて" },
  { value: "general", label: "全般" },
  { value: "ppf", label: "PPF" },
  { value: "coating", label: "コーティング" },
  { value: "body_repair", label: "ボディリペア" },
  { value: "maintenance", label: "メンテナンス" },
];

const LEVELS = [
  { value: "", label: "すべて" },
  { value: "intro", label: "入門" },
  { value: "basic", label: "基礎" },
  { value: "standard", label: "標準" },
  { value: "pro", label: "応用" },
];

const LEVEL_BADGE: Record<string, string> = {
  intro: "bg-success-dim text-success border-success/20",
  basic: "bg-accent/10 text-accent border-accent/20",
  standard: "bg-purple-500/10 text-purple-300 border-purple-400/20",
  pro: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
};

const LEVEL_LABEL: Record<string, string> = {
  intro: "入門",
  basic: "基礎",
  standard: "標準",
  pro: "応用",
};

function StarRating({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <span className="text-yellow-400 text-xs">
      {"★".repeat(full)}
      <span className="text-muted">{"★".repeat(5 - full)}</span>
    </span>
  );
}

export default function AcademyLearnPage() {
  const [tab, setTab] = useState<"published" | "drafts" | "mine">("published");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [introOnly, setIntroOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const fetchLessons = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tab });
      if (category) params.set("category", category);
      if (level) params.set("level", level);
      const res = await fetch(`/api/admin/academy/lessons?${params}`);
      const data = await res.json();
      setLessons(data.lessons ?? []);
      setIntroOnly(Boolean(data.intro_only));
    } catch {
      setLessons([]);
      setIntroOnly(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLessons();
  }, [tab, category, level]);

  // 完了済みIDを取得 (タブ切替で再取得するほど重要ではないので初回のみ)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/academy/progress");
        if (!res.ok) return;
        const data = await res.json();
        setCompletedIds(new Set<string>(data.completed_lesson_ids ?? []));
      } catch {
        // noop
      }
    })();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <Link href="/admin/academy" className="text-sm text-accent hover:underline">
            ← Academy
          </Link>
          <h1 className="text-xl font-bold text-primary mt-2 flex items-center gap-2">
            <span>📖</span> オンライン学習
          </h1>
          <p className="text-sm text-muted mt-1">運営・先輩加盟店のレッスンで知識を深めよう。良いレッスンへの評価は投稿者の報酬・割引につながります。</p>
        </div>
        <Link
          href="/admin/academy/learn/new"
          className="shrink-0 text-sm px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
        >
          + レッスン投稿
        </Link>
      </div>

      {/* 入門ロック説明 */}
      {introOnly && tab === "published" && (
        <div className="mb-4 p-3 bg-warning-dim border border-warning/30 rounded-xl text-xs text-warning flex items-start gap-2">
          <span className="mt-0.5">🔒</span>
          <div>
            <p className="font-medium">入門レッスンのみ表示中</p>
            <p className="text-warning/70 mt-0.5">
              基礎以上のレッスンは Starter プラン以上で閲覧できます。先輩加盟店が積み上げた知見を尊重するための制限です。
            </p>
          </div>
        </div>
      )}

      {/* タブ */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-1 bg-inset rounded-lg p-1">
          {(
            [
              { v: "published", label: "📚 公開レッスン" },
              { v: "drafts", label: "✏️ 下書き" },
              { v: "mine", label: "👤 自分の投稿" },
            ] as const
          ).map((t) => (
            <button
              key={t.v}
              onClick={() => setTab(t.v)}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                tab === t.v ? "bg-surface text-primary font-medium shadow-sm" : "text-muted hover:text-secondary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="text-sm bg-inset border border-border-subtle rounded-lg px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            disabled={tab === "published" && introOnly}
            className="text-sm bg-inset border border-border-subtle rounded-lg px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50"
          >
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* レッスン一覧 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : lessons.length === 0 ? (
        <div className="text-center py-12 text-muted">
          <div className="text-4xl mb-2">📭</div>
          <p className="text-sm">
            {tab === "drafts"
              ? "下書きはありません"
              : tab === "mine"
                ? "投稿したレッスンはありません"
                : "条件に合うレッスンが見つかりません"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {lessons.map((l) => (
            <Link
              key={l.id}
              href={`/admin/academy/learn/${l.id}`}
              className="glass-card p-4 hover:border-accent/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs px-2 py-0.5 border rounded-full ${LEVEL_BADGE[l.level] ?? ""}`}
                  >
                    {LEVEL_LABEL[l.level] ?? l.level}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-inset border border-border-subtle rounded-full text-secondary">
                    {l.category}
                  </span>
                  {!l.tenant_id && (
                    <span className="text-xs px-2 py-0.5 bg-accent/10 border border-accent/30 rounded-full text-accent">
                      運営
                    </span>
                  )}
                </div>
                {l.status === "draft" && (
                  <span className="text-xs px-2 py-0.5 bg-warning-dim border border-warning/30 text-warning rounded-full">
                    下書き
                  </span>
                )}
                {completedIds.has(l.id) && (
                  <span className="text-xs px-2 py-0.5 bg-success-dim border border-success/30 text-success rounded-full">
                    ✓ 完了
                  </span>
                )}
              </div>
              <h2 className="font-semibold text-primary line-clamp-2 mb-1">{l.title}</h2>
              {l.summary && <p className="text-sm text-secondary line-clamp-2 mb-3">{l.summary}</p>}
              <div className="flex items-center gap-3 text-xs text-muted">
                <StarRating value={l.rating_avg} />
                <span>({l.rating_count})</span>
                <span>👁 {l.view_count}</span>
                <span className="text-yellow-400">{"★".repeat(l.difficulty)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
