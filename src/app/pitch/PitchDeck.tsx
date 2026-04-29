"use client";

import { useState, useEffect, useCallback } from "react";

export type Slide = { id: string; node: React.ReactNode };

export function PitchDeck({
  slides,
  label,
}: {
  slides: Slide[];
  label: string;
}) {
  const [cur, setCur] = useState(0);

  const prev = useCallback(() => setCur((c) => Math.max(0, c - 1)), []);
  const next = useCallback(
    () => setCur((c) => Math.min(slides.length - 1, c + 1)),
    [slides.length],
  );

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [next, prev]);

  return (
    <>
      {/* ── スクリーン表示: 1枚ずつ ── */}
      <div className="print:hidden flex flex-col min-h-screen bg-[#060a12] select-none">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.08] shrink-0">
          <span className="text-white font-bold tracking-tight text-sm">Ledra</span>
          <div className="flex items-center gap-4">
            <span className="text-white/40 text-xs">{label}</span>
            <span className="text-white/30 text-xs font-mono">
              {cur + 1} / {slides.length}
            </span>
            <button
              onClick={() => window.print()}
              className="text-xs border border-white/20 rounded-lg px-3 py-1.5 text-white/60 hover:text-white hover:border-white/40 transition cursor-pointer"
            >
              PDF出力
            </button>
          </div>
        </div>

        {/* Slide area */}
        <div className="flex-1 flex items-center justify-center p-4 md:p-8 min-h-0">
          <div className="w-full max-w-[960px] aspect-video relative rounded-xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.6)]">
            {slides.map((s, i) => (
              <div
                key={s.id}
                className={`absolute inset-0 transition-opacity duration-250 ${
                  i === cur
                    ? "opacity-100 pointer-events-auto"
                    : "opacity-0 pointer-events-none"
                }`}
              >
                {s.node}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-white/[0.08] shrink-0">
          <button
            onClick={prev}
            disabled={cur === 0}
            className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            前へ
          </button>

          <div className="flex gap-1.5 items-center">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCur(i)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  i === cur ? "w-6 bg-white" : "w-1.5 bg-white/25 hover:bg-white/50"
                }`}
              />
            ))}
          </div>

          <button
            onClick={next}
            disabled={cur === slides.length - 1}
            className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition cursor-pointer"
          >
            次へ
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── 印刷表示: 全スライドをA4横で出力 ── */}
      <div className="hidden print:block">
        {slides.map((s) => (
          <div
            key={s.id}
            style={{
              width: "297mm",
              height: "210mm",
              overflow: "hidden",
              pageBreakAfter: "always",
              breakAfter: "page",
              position: "relative",
            }}
          >
            {s.node}
          </div>
        ))}
      </div>
    </>
  );
}
