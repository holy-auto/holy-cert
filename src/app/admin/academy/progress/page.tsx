"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Badge {
  id: string;
  emoji: string;
  label: string;
  description: string;
}

interface Progress {
  level: number;
  total_score: number;
  lessons_completed: number;
  cases_submitted: number;
  certs_reviewed: number;
  standard_level: string;
  last_activity_at: string | null;
}

interface RecentCompletion {
  lesson_id: string;
  lesson_title: string;
  lesson_level: string | null;
  score_earned: number;
  completed_at: string;
}

const LEVEL_LABEL: Record<string, string> = {
  intro: "入門",
  basic: "基礎",
  standard: "標準",
  pro: "応用",
};

export default function AcademyProgressPage() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [recent, setRecent] = useState<RecentCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/academy/progress");
        const data = await res.json();
        if (canceled) return;
        if (res.ok) {
          setProgress(data.progress);
          setBadges(data.badges ?? []);
          setRecent(data.recent_completions ?? []);
        }
      } finally {
        if (!canceled) setLoading(false);
      }
    })();
    return () => {
      canceled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-sm text-muted">
        進捗データの取得に失敗しました
      </div>
    );
  }

  // 次のレベルまでの進捗バー (100pt = 1 level)
  const currentLevelStart = (progress.level - 1) * 100;
  const nextLevelAt = progress.level * 100;
  const inLevel = Math.max(0, progress.total_score - currentLevelStart);
  const pct = Math.min(100, Math.round((inLevel / 100) * 100));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/admin/academy" className="text-sm text-accent hover:underline">
          ← Academy
        </Link>
        <h1 className="text-xl font-bold text-primary mt-2 flex items-center gap-2">
          <span>📈</span> 学習進捗
        </h1>
        <p className="text-sm text-muted mt-1">
          完了したレッスン・施工事例提供で獲得したスコアと、これまで集めたバッジを確認できます。
        </p>
      </div>

      {/* レベル + スコア */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-3">
          <div>
            <div className="text-xs text-muted">あなたのレベル</div>
            <div className="text-4xl font-bold text-accent">Lv.{progress.level}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted">累計スコア</div>
            <div className="text-2xl font-semibold text-primary">{progress.total_score} pt</div>
          </div>
        </div>
        <div className="bg-inset rounded-full h-3 overflow-hidden">
          <div
            className="bg-accent h-3 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="text-xs text-muted mt-2">
          次のレベルまで あと {Math.max(0, nextLevelAt - progress.total_score)} pt
        </div>
      </div>

      {/* 統計 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "完了レッスン", value: progress.lessons_completed, sub: "件" },
          { label: "公開した事例", value: progress.cases_submitted, sub: "件" },
          { label: "添削した証明書", value: progress.certs_reviewed, sub: "件" },
          { label: "Ledra Standard", value: progress.standard_level, sub: "" },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {s.value}
              {s.sub && <span className="text-sm text-muted ml-1">{s.sub}</span>}
            </div>
            <div className="text-xs text-muted mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* バッジ */}
      <div className="glass-card p-5 mb-6">
        <h2 className="font-semibold text-primary mb-3 flex items-center gap-2">
          <span>🎖</span> 獲得バッジ
        </h2>
        {badges.length === 0 ? (
          <p className="text-sm text-muted">
            まだバッジがありません。レッスン完了や事例公開で獲得できます。
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {badges.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-inset border border-border-subtle"
              >
                <span className="text-3xl">{b.emoji}</span>
                <div>
                  <div className="text-sm font-medium text-primary">{b.label}</div>
                  <div className="text-xs text-muted">{b.description}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 直近の完了 */}
      <div className="glass-card p-5">
        <h2 className="font-semibold text-primary mb-3 flex items-center gap-2">
          <span>🕒</span> 直近の完了
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted">完了したレッスンはまだありません</p>
        ) : (
          <ul className="space-y-2">
            {recent.map((r) => (
              <li key={r.lesson_id} className="flex items-center justify-between gap-3 text-sm">
                <Link
                  href={`/admin/academy/learn/${r.lesson_id}`}
                  className="flex-1 truncate text-secondary hover:text-accent transition-colors"
                >
                  {r.lesson_level && (
                    <span className="text-xs px-1.5 py-0.5 bg-accent/10 border border-accent/20 rounded mr-2 text-accent">
                      {LEVEL_LABEL[r.lesson_level] ?? r.lesson_level}
                    </span>
                  )}
                  {r.lesson_title}
                </Link>
                <span className="text-xs text-muted shrink-0">
                  +{r.score_earned} pt · {new Date(r.completed_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
