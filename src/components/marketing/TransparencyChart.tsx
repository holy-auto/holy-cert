"use client";

import { useEffect, useRef, useState } from "react";
import type { ChartPoint } from "@/lib/marketing/transparency";

/**
 * TransparencyChart — Client Component
 *
 * 直近 6 ヶ月の証明書発行数を棒グラフで表示。スクロールで視界に入った瞬間に
 * 各バーが下から伸びる。誇張しないよう、軸は最大値基準で線形にスケールする。
 */
export function TransparencyChart({ data }: { data: ChartPoint[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [grown, setGrown] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setGrown(true);
            obs.disconnect();
          }
        }
      },
      { threshold: 0.25 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const max = Math.max(...data.map((d) => d.value), 1);
  const lastIndex = data.length - 1;

  return (
    <div
      ref={containerRef}
      className="flex items-end gap-3 sm:gap-4 h-[220px] rounded-2xl border border-white/[0.08] bg-white/[0.02] px-5 sm:px-8 pt-12 pb-5"
      role="img"
      aria-label={`証明書発行数の推移: ${data.map((d) => `${d.label} ${d.value}件`).join("、")}`}
    >
      {data.map((point, i) => {
        const isLatest = i === lastIndex;
        // 最大値で 88% の高さ。最小でも 6% は見せる (0 でも存在を可視化)。
        const targetPct = Math.max((point.value / max) * 88, 6);
        return (
          <div key={point.label} className="flex-1 flex flex-col items-center gap-3 h-full justify-end">
            <div className="relative w-full max-w-[48px] flex-1 flex items-end">
              <div
                className={`w-full rounded-t-[3px] transition-[height] duration-[900ms] ease-[cubic-bezier(.16,1,.3,1)] ${
                  isLatest ? "bg-blue-500" : "bg-[#2d3a73]"
                }`}
                style={{
                  height: grown ? `${targetPct}%` : "0%",
                  transitionDelay: `${i * 110}ms`,
                }}
              >
                <span
                  className={`absolute -top-7 left-1/2 -translate-x-1/2 font-mono text-[0.688rem] font-bold whitespace-nowrap transition-opacity duration-500 ${
                    isLatest ? "text-blue-300" : "text-white"
                  }`}
                  style={{ opacity: grown ? 1 : 0, transitionDelay: `${i * 110 + 500}ms` }}
                >
                  {point.value.toLocaleString()}
                </span>
              </div>
            </div>
            <span className="font-mono text-[0.625rem] sm:text-[0.688rem] text-white">{point.label}</span>
          </div>
        );
      })}
    </div>
  );
}
