"use client";

import { useEffect, useState } from "react";
import { useScrollReveal } from "./useScrollReveal";

type Tone = "good" | "warn";

export type TransparencyMetric = {
  label: string;
  /** 集計対象の数値 */
  value: number;
  /** 小数桁数 (解約率など) */
  decimals?: number;
  /** 値の後ろに付く単位 (件 / 店 / %) */
  unit?: string;
  /** 状態ドット・補足の色味 */
  tone: Tone;
  /** 数字の下に出す方向性コメント (前月比ではなく、隠さず率直に) */
  delta: string;
  /** 補足説明 */
  note: string;
};

function CountUp({ target, decimals = 0 }: { target: number; decimals?: number }) {
  const { ref, isVisible } = useScrollReveal(0.3);
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    const duration = 1400;
    const start = performance.now();
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      setValue(target * easeOutCubic(progress));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [isVisible, target]);

  const shown = decimals > 0 ? value.toFixed(decimals) : Math.floor(value).toLocaleString();

  return <span ref={ref}>{shown}</span>;
}

export function TransparencyMetrics({ metrics }: { metrics: TransparencyMetric[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-px rounded-2xl border border-white/[0.08] bg-white/[0.08] overflow-hidden">
      {metrics.map((m) => (
        <div key={m.label} className="bg-[#0a0f1a] p-7 md:p-8">
          <div className="flex items-center gap-2 text-xs text-white">
            <span
              className={`block w-1.5 h-1.5 rounded-full ${m.tone === "good" ? "bg-emerald-400" : "bg-amber-400"}`}
            />
            {m.label}
          </div>

          <div className="mt-4 text-[2.5rem] md:text-[2.75rem] font-bold leading-none tracking-tight text-white">
            <CountUp target={m.value} decimals={m.decimals} />
            {m.unit && <span className="ml-1 text-base font-medium text-white">{m.unit}</span>}
          </div>

          <div
            className={`mt-3 font-mono text-xs font-bold ${m.tone === "good" ? "text-emerald-300" : "text-amber-300"}`}
          >
            {m.delta}
          </div>
          <p className="mt-2 text-[0.72rem] leading-relaxed text-white">{m.note}</p>
        </div>
      ))}
    </div>
  );
}
