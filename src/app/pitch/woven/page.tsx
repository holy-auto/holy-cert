import { PitchDeck, type Slide } from "../PitchDeck";

// ─── Slide chrome ───────────────────────────────────────────────
function S({
  children,
  n,
  total = 6,
}: {
  children: React.ReactNode;
  n: number;
  total?: number;
}) {
  return (
    <div
      className="w-full h-full flex flex-col bg-[#060a12] overflow-hidden"
      style={{ fontFamily: "var(--font-noto), var(--font-noto-sans), sans-serif" }}
    >
      <div className="h-[3px] w-full bg-gradient-to-r from-emerald-500 to-teal-400 shrink-0" />
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">{children}</div>
      <div className="px-10 py-2.5 flex items-center justify-between border-t border-white/[0.06] shrink-0">
        <span className="text-white/30 text-[11px] tracking-wide">Ledra — Confidential · 2026年4月</span>
        <span className="text-white/25 text-[11px] font-mono">{n}/{total}</span>
      </div>
    </div>
  );
}

function Chip({ children, color = "emerald" }: { children: React.ReactNode; color?: string }) {
  const cls =
    color === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : color === "teal"
        ? "border-teal-500/30 bg-teal-500/10 text-teal-300"
        : "border-white/15 bg-white/5 text-white/60";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cls}`}
    >
      {children}
    </span>
  );
}

// ─── スライド定義 ───────────────────────────────────────────────

const S1 = (
  <S n={1}>
    {/* Cover */}
    <div className="flex flex-col items-center justify-center flex-1 text-center px-10 gap-5">
      <div className="flex gap-2 flex-wrap justify-center">
        <Chip>Woven by Toyota</Chip>
        <Chip color="teal">スタートアップ連携</Chip>
        <Chip color="none">PoC 2026</Chip>
      </div>
      <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight text-white">
        Woven City ×{" "}
        <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
          Ledra
        </span>
      </h1>
      <p className="text-base text-white/70 max-w-xl leading-relaxed">
        車両施工記録をスマートシティの
        <br />
        真正性インフラへ。
      </p>
      <div className="mt-2 flex gap-6 text-xs text-white/40">
        <span>Polygon PoS Anchoring</span>
        <span>·</span>
        <span>C2PA 写真署名</span>
        <span>·</span>
        <span>NFC 車両パスポート</span>
      </div>
    </div>
  </S>
);

const S2 = (
  <S n={2}>
    {/* Problem */}
    <div className="flex flex-col flex-1 px-10 pt-8 pb-2 gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-2">
          現状課題
        </p>
        <h2 className="text-2xl font-extrabold text-white leading-snug">
          施工記録は今も
          <br />「紙と信頼」で動いている
        </h2>
      </div>
      <div className="grid grid-cols-3 gap-4 flex-1">
        {[
          {
            n: "01",
            title: "改ざんを検知できない",
            body: "施工写真の差し替えや証明書の書き換えを防ぐ仕組みがなく、査定・保険審査で証明書が信頼されにくい。",
          },
          {
            n: "02",
            title: "店舗をまたいで履歴が消える",
            body: "コーティング店・PPF店・整備工場がバラバラに記録を持ち、VIN単位で施工歴を集約する仕組みが存在しない。",
          },
          {
            n: "03",
            title: "第三者が客観的に確認できない",
            body: "中古車査定担当者・保険会社・次のオーナーが施工の事実を独立して検証できる仕組みがない。",
          },
        ].map((item) => (
          <div
            key={item.n}
            className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 flex flex-col gap-3"
          >
            <span className="font-mono text-emerald-500 text-xs font-bold">{item.n}</span>
            <h3 className="text-sm font-bold text-white leading-snug">{item.title}</h3>
            <p className="text-xs text-white/65 leading-relaxed">{item.body}</p>
          </div>
        ))}
      </div>
    </div>
  </S>
);

const S3 = (
  <S n={3}>
    {/* Solution - How it works */}
    <div className="flex flex-col flex-1 px-10 pt-8 pb-2 gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-2">
          解決策
        </p>
        <h2 className="text-2xl font-extrabold text-white leading-snug">
          施工完了から証明完結まで — 4ステップ
        </h2>
      </div>
      <div className="flex-1 flex flex-col justify-center gap-3">
        {[
          {
            n: 1,
            label: "施工完了 → Ledra管理画面を開く",
            detail: "スマホ・PCから施工内容・写真を登録。ワンクリックでQR付き証明書が発行。",
            badge: "スタッフ操作",
          },
          {
            n: 2,
            label: "C2PA署名 + SHA-256ハッシュ",
            detail: "施工写真にコンテンツ真正性マニフェストが埋め込まれ、ハッシュ値が生成される。",
            badge: "自動処理",
          },
          {
            n: 3,
            label: "Polygon PoSにアンカー",
            detail: "ハッシュをスマートコントラクトに送信。この時点で写真の改ざんは永久に検知可能。",
            badge: "自動処理",
          },
          {
            n: 4,
            label: "車両パスポート /v/[VIN] が自動更新",
            detail: "VINに紐づく全施工店の証明書が1つのタイムラインに集約。QRやNFCでアクセス可能。",
            badge: "自動処理",
          },
        ].map((step) => (
          <div key={step.n} className="flex items-start gap-4">
            <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xs font-bold text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]">
              {step.n}
            </div>
            <div className="flex-1 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-2.5 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-white">{step.label}</span>
                <p className="text-xs text-white/55 mt-0.5 leading-relaxed">{step.detail}</p>
              </div>
              <span className="text-[10px] border border-white/10 rounded-full px-2 py-0.5 text-white/40 shrink-0">
                {step.badge}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </S>
);

const S4 = (
  <S n={4}>
    {/* Demo - Vehicle Passport */}
    <div className="flex flex-1 px-10 pt-8 pb-2 gap-8">
      {/* Left: explanation */}
      <div className="flex flex-col gap-4 w-[38%] shrink-0">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-2">
            デモ
          </p>
          <h2 className="text-2xl font-extrabold text-white leading-snug">
            車両デジタルパスポート
            <br />
            <span className="font-mono text-lg text-emerald-400">/v/[VIN]</span>
          </h2>
        </div>
        <div className="flex flex-col gap-3 flex-1">
          {[
            {
              title: "テナント横断で自動集約",
              body: "A店でコーティング、B店でPPF — 複数店の記録が同一VINに集まる。",
            },
            {
              title: "NFCタグと連携",
              body: "車両貼付タグをスキャン → パスポートにすぐアクセス。",
            },
            {
              title: "第三者が独立して検証可能",
              body: "URLを共有するだけで保険会社・査定担当者が確認できる。",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3"
            >
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
              <div>
                <div className="text-xs font-bold text-white">{item.title}</div>
                <div className="text-xs text-white/55 mt-0.5 leading-relaxed">{item.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: passport mock */}
      <div className="flex-1 flex items-center">
        <div className="w-full rounded-xl border border-white/[0.1] bg-[#0d1220] overflow-hidden text-[11px]">
          {/* Browser bar */}
          <div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.03] px-3 py-2">
            <div className="flex gap-1">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/50" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-500/50" />
            </div>
            <div className="flex-1 text-center bg-white/[0.05] rounded px-2 py-0.5 font-mono text-white/60 text-[10px]">
              ledra.co.jp/v/JT2BF22K1W0066983
            </div>
          </div>
          {/* Content */}
          <div className="p-4 space-y-3">
            <div>
              <div className="text-base font-bold text-white">Toyota Alphard 2024</div>
              <div className="font-mono text-[10px] text-white/50 mt-0.5">VIN: JT2BF22K1W0066983</div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Chip>アンカー済み施工証明 3件</Chip>
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 px-2.5 py-1 text-[11px] font-semibold">
                関与施工店 2店
              </span>
            </div>
            <div className="space-y-2">
              {[
                { date: "2024-06-15", type: "セラミックコーティング", shop: "Woven City モビリティセンター" },
                { date: "2024-09-03", type: "PPF施工（フロント）", shop: "Woven City モビリティセンター" },
                { date: "2025-02-20", type: "車両整備", shop: "トヨタモビリティ東京" },
              ].map((c, i) => (
                <div
                  key={i}
                  className="flex gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5"
                >
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full border border-emerald-500 bg-emerald-500/20" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-semibold text-white">{c.type}</span>
                      <Chip>Polygon済</Chip>
                    </div>
                    <div className="text-[10px] text-white/50 mt-0.5">
                      {c.shop} · {c.date}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="font-mono text-[10px] text-white/40 bg-white/[0.02] border border-white/[0.05] rounded-lg px-3 py-2">
              Tx: 0x7f3a9b2c1d4e5f6a7b8c9d0e1f2a3b4c...
            </div>
          </div>
        </div>
      </div>
    </div>
  </S>
);

const S5 = (
  <S n={5}>
    {/* PoC Proposal */}
    <div className="flex flex-col flex-1 px-10 pt-8 pb-2 gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-2">
          PoC提案
        </p>
        <h2 className="text-2xl font-extrabold text-white leading-snug">
          Woven Cityで、試してみませんか
        </h2>
        <p className="text-sm text-white/55 mt-1">最小限のコミットメントで、最大限のデータを。</p>
      </div>
      <div className="flex gap-5 flex-1">
        {/* Scope */}
        <div className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
          <div className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-4">
            PoCスコープ
          </div>
          <div className="space-y-3">
            {[
              { label: "期間", value: "3ヶ月" },
              { label: "対象施設", value: "Woven City内1拠点（または指定施設）" },
              { label: "費用", value: "Ledraサブスクリプション費用：全額Ledra負担" },
              { label: "必要書類", value: "NDA + PoC合意書のみ（本番採用の義務なし）" },
              { label: "レポート", value: "週次データレポート（発行数・アンカー成功率・閲覧数）" },
            ].map((row) => (
              <div
                key={row.label}
                className="flex gap-3 border-b border-white/[0.05] pb-3 last:border-0 last:pb-0"
              >
                <span className="text-xs text-white/45 w-24 shrink-0">{row.label}</span>
                <span className="text-xs font-semibold text-white">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Success metrics */}
        <div className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
          <div className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-4">
            成功指標（3ヶ月）
          </div>
          <div className="space-y-3">
            {[
              { metric: "発行証明書数", target: "50件以上" },
              { metric: "Polygonアンカー成功率", target: "95%以上" },
              { metric: "車両パスポート発行VIN数", target: "30台以上" },
              { metric: "パスポートページ閲覧数", target: "延べ100回以上" },
              { metric: "施設スタッフ継続利用率", target: "3ヶ月間継続" },
            ].map((row) => (
              <div key={row.metric} className="flex items-center justify-between gap-3">
                <span className="text-xs text-white/70">{row.metric}</span>
                <Chip>{row.target}</Chip>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </S>
);

const S6 = (
  <S n={6}>
    {/* Next Step */}
    <div className="flex flex-col items-center justify-center flex-1 text-center px-10 gap-6">
      <Chip>Next Step</Chip>
      <h2 className="text-3xl font-extrabold text-white leading-snug">
        まず 15分、話しませんか
      </h2>
      <p className="text-sm text-white/65 max-w-lg leading-relaxed">
        長文の提案書も、複雑な契約も必要ありません。
        <br />
        デモを見ていただき、関心があればNDAのみで始められます。
      </p>
      <div className="flex gap-8 mt-2">
        {[
          { n: "1", label: "15分オンラインMTG", sub: "デモ動画 + Q&A" },
          { n: "2", label: "PoC合意", sub: "NDA署名のみ" },
          { n: "3", label: "3ヶ月で実データ", sub: "成果レポート共有" },
        ].map((step) => (
          <div key={step.n} className="flex flex-col items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-sm font-bold text-white shadow-[0_0_16px_rgba(16,185,129,0.4)]">
              {step.n}
            </div>
            <div className="text-sm font-bold text-white">{step.label}</div>
            <div className="text-xs text-white/50">{step.sub}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-col gap-1 text-xs text-white/40">
        <span>ledra.co.jp/contact</span>
        <span>Polygon PoS · C2PA · NFC · 第三者セキュリティ監査済み</span>
      </div>
    </div>
  </S>
);

// ─── Page ───────────────────────────────────────────────────────

export const metadata = {
  title: "Ledra × Woven by Toyota | Pitch Deck",
  robots: { index: false, follow: false },
};

const slides: Slide[] = [
  { id: "cover", node: S1 },
  { id: "problem", node: S2 },
  { id: "solution", node: S3 },
  { id: "demo", node: S4 },
  { id: "poc", node: S5 },
  { id: "next", node: S6 },
];

export default function WovenPitchPage() {
  return <PitchDeck slides={slides} label="Woven by Toyota 向け" />;
}
