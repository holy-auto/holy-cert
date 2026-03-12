"use client";

type Props = {
  recentActivity: { date: string; count: number }[];
  statusBreakdown: { status: string; count: number }[];
};

const STATUS_LABELS: Record<string, string> = {
  active: "有効",
  void: "無効化",
  expired: "期限切れ",
  draft: "下書き",
  unknown: "不明",
};

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981",
  void: "#ef4444",
  expired: "#f59e0b",
  draft: "#71717a",
  unknown: "#3f3f46",
};

function BarChart({ data }: { data: { date: string; count: number }[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const barWidth = 100 / data.length;

  return (
    <div className="glass-card p-5">
      <div className="text-xs font-semibold tracking-[0.18em] text-muted mb-1">ISSUE TREND</div>
      <div className="text-base font-semibold text-primary mb-4">直近30日の発行数</div>

      <div className="relative" style={{ height: 160 }}>
        <svg width="100%" height="100%" viewBox="0 0 300 160" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <line
              key={ratio}
              x1="0"
              y1={160 - ratio * 140}
              x2="300"
              y2={160 - ratio * 140}
              stroke="#27272a"
              strokeWidth="0.5"
            />
          ))}

          {/* Bars */}
          {data.map((d, i) => {
            const barH = (d.count / maxCount) * 140;
            const x = (i / data.length) * 300;
            const w = (1 / data.length) * 300 * 0.7;
            return (
              <g key={d.date}>
                <rect
                  x={x + w * 0.2}
                  y={160 - barH}
                  width={w}
                  height={barH}
                  rx={2}
                  fill="url(#barGradient)"
                  opacity={d.count > 0 ? 1 : 0.15}
                />
                {d.count > 0 && (
                  <text
                    x={x + w * 0.2 + w / 2}
                    y={160 - barH - 4}
                    textAnchor="middle"
                    fill="#a1a1aa"
                    fontSize="8"
                  >
                    {d.count}
                  </text>
                )}
              </g>
            );
          })}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.3" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-muted">{data[0]?.date.slice(5)}</span>
        <span className="text-[10px] text-muted">{data[Math.floor(data.length / 2)]?.date.slice(5)}</span>
        <span className="text-[10px] text-muted">{data[data.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

function DonutChart({ data }: { data: { status: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) {
    return (
      <div className="glass-card p-5">
        <div className="text-xs font-semibold tracking-[0.18em] text-muted mb-1">STATUS</div>
        <div className="text-base font-semibold text-primary mb-4">ステータス別内訳</div>
        <div className="flex items-center justify-center h-40 text-muted text-sm">データなし</div>
      </div>
    );
  }

  const radius = 60;
  const cx = 80;
  const cy = 80;
  const strokeWidth = 20;
  const circumference = 2 * Math.PI * radius;

  let cumulativeOffset = 0;
  const segments = data
    .filter((d) => d.count > 0)
    .map((d) => {
      const ratio = d.count / total;
      const dashLength = ratio * circumference;
      const offset = cumulativeOffset;
      cumulativeOffset += dashLength;
      return {
        ...d,
        ratio,
        dashLength,
        dashOffset: circumference - offset,
        color: STATUS_COLORS[d.status] ?? "#3f3f46",
      };
    });

  return (
    <div className="glass-card p-5">
      <div className="text-xs font-semibold tracking-[0.18em] text-muted mb-1">STATUS</div>
      <div className="text-base font-semibold text-primary mb-4">ステータス別内訳</div>

      <div className="flex items-center gap-6">
        {/* Donut */}
        <div className="relative flex-shrink-0">
          <svg width="160" height="160" viewBox="0 0 160 160">
            {/* Background ring */}
            <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#27272a" strokeWidth={strokeWidth} />

            {/* Segments */}
            {segments.map((seg) => (
              <circle
                key={seg.status}
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${seg.dashLength} ${circumference - seg.dashLength}`}
                strokeDashoffset={seg.dashOffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${cx} ${cy})`}
                style={{ transition: "stroke-dasharray 0.5s, stroke-dashoffset 0.5s" }}
              />
            ))}

            {/* Center text */}
            <text x={cx} y={cy - 6} textAnchor="middle" fill="#fafafa" fontSize="22" fontWeight="700">
              {total}
            </text>
            <text x={cx} y={cy + 12} textAnchor="middle" fill="#71717a" fontSize="10">
              Total
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          {segments.map((seg) => (
            <div key={seg.status} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-sm text-secondary">
                  {STATUS_LABELS[seg.status] ?? seg.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-primary">{seg.count}</span>
                <span className="text-xs text-muted">{Math.round(seg.ratio * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardCharts({ recentActivity, statusBreakdown }: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <BarChart data={recentActivity} />
      <DonutChart data={statusBreakdown} />
    </div>
  );
}
