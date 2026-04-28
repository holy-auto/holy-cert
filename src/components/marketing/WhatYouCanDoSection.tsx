import { Section } from "./Section";
import { SectionHeading } from "./SectionHeading";
import { ScrollReveal } from "./ScrollReveal";
import { ScreenshotFrame } from "./ScreenshotFrame";

/**
 * 「Ledra でできること」セクション。
 * 旧: 課題提起 → 解決 → 流れ → エコシステム / 証明書プレビュー の 5 セクションを 1 つに圧縮。
 *
 * 各カードは「機能タイトル + 1〜2 行説明 + 画面スクショ」で構成。
 * `src` の画像が `public/` 配下に存在しない場合は children のモックにフォールバックする
 * （ScreenshotFrame が fs チェックを行う）。
 */
export function WhatYouCanDoSection() {
  return (
    <Section id="features">
      <SectionHeading
        title="Ledra でできること"
        subtitle="現場の発行作業から、経営の意思決定まで。Ledra ひとつで完結します。"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {/* 1. 証明書を WEB で発行 */}
        <FeatureCard
          eyebrow="01 — Issue"
          title="WEB から、数分で証明書を発行"
          description="テンプレートに沿って入力するだけ。施工写真や自社ロゴも添付できます。"
          delay={0}
        >
          <ScreenshotFrame
            src="/marketing/screenshots/07-certificate-new.png"
            alt="証明書の発行画面"
            url="admin.ledra.app/certs/new"
          >
            <CertNewMockBody />
          </ScreenshotFrame>
        </FeatureCard>

        {/* 2. 発行履歴を一覧で管理 */}
        <FeatureCard
          eyebrow="02 — Manage"
          title="発行履歴を、一覧でまとめて管理"
          description="店舗の証明書を一画面で。検索・PDF/CSV エクスポートにも対応。"
          delay={80}
        >
          <ScreenshotFrame
            src="/marketing/screenshots/02-certificates-list.png"
            alt="証明書一覧画面"
            url="admin.ledra.app/certs"
          >
            <ListMockBody
              label="証明書一覧"
              rows={[
                "LEDRA-DEMO-013  山田 太郎  ガラス",
                "LEDRA-DEMO-012  小林 あかね  PPF",
                "LEDRA-DEMO-011  佐藤 花子  コーティング",
              ]}
            />
          </ScreenshotFrame>
        </FeatureCard>

        {/* 3. 車両ごとの履歴 */}
        <FeatureCard
          eyebrow="03 — Vehicle"
          title="車両ごとの施工履歴を、まるごと追跡"
          description="ナンバー単位で施工・予約・NFC を時系列に統合表示。次の施工提案にもつながります。"
          delay={160}
        >
          <ScreenshotFrame
            src="/marketing/screenshots/04-vehicle-timeline.png"
            alt="車両ごとの施工履歴タイムライン"
            url="admin.ledra.app/vehicles/.../timeline"
          >
            <ListMockBody
              label="車両タイムライン"
              rows={[
                "2026/4/6  ボディガラスコーティング再施工",
                "2026/2/10  セラミックコーティング (8 層)",
                "2025/9/12  PPF 部分施工 (前面)",
              ]}
            />
          </ScreenshotFrame>
        </FeatureCard>

        {/* 4. 顧客 360 */}
        <FeatureCard
          eyebrow="04 — Customer"
          title="顧客 360 で、リピートにつなげる"
          description="顧客ごとの証明書・車両・予約・請求をひとまとめに。営業の意思決定が速くなります。"
          delay={240}
        >
          <ScreenshotFrame
            src="/marketing/screenshots/05-customer-360.png"
            alt="顧客 360 画面"
            url="admin.ledra.app/customers/..."
          >
            <ListMockBody
              label="顧客詳細"
              rows={["山田 太郎 / 4 件の証明書", "車両: TOYOTA Alphard", "予約: 2026/5/15 ガラス再施工"]}
            />
          </ScreenshotFrame>
        </FeatureCard>

        {/* 5. URL で公開・共有 */}
        <FeatureCard
          eyebrow="05 — Share"
          title="URL で、保険会社にも顧客にも共有"
          description="発行された証明書は固有 URL で公開可能。改ざん検知付きの公開ページが即座に開けます。"
          delay={320}
        >
          <ScreenshotFrame
            src="/marketing/screenshots/08-public-cert-desktop.png"
            alt="公開された施工証明書"
            url="ledra.app/c/LEDRA-DEMO-0002"
            objectPosition="center top"
          >
            <CertShareMockBody />
          </ScreenshotFrame>
        </FeatureCard>

        {/* 6. KPI ダッシュボード */}
        <FeatureCard
          eyebrow="06 — Insight"
          title="店舗別 KPI を、ダッシュボードで把握"
          description="発行件数・売上・取引完了率を、店舗別・期間別に一目で確認できます。"
          delay={400}
        >
          <ScreenshotFrame
            src="/marketing/screenshots/01-admin-dashboard.png"
            alt="管理ダッシュボード"
            url="admin.ledra.app/dashboard"
          >
            <DashboardMockBody />
          </ScreenshotFrame>
        </FeatureCard>
      </div>
    </Section>
  );
}

function FeatureCard({
  eyebrow,
  title,
  description,
  delay,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <ScrollReveal variant="fade-up" delay={delay}>
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 md:p-7 hover:bg-white/[0.05] hover:border-white/[0.14] transition-all duration-300 h-full flex flex-col">
        <div className="text-[0.688rem] font-medium uppercase tracking-widest text-blue-300/80">{eyebrow}</div>
        <h3 className="mt-2 text-lg md:text-xl font-bold leading-snug text-white">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/80">{description}</p>
        <div className="mt-5">{children}</div>
      </div>
    </ScrollReveal>
  );
}

/* ------------------------------------------------------------------ */
/* Fallback mocks — ScreenshotFrame の src が無い時の代替表示 */
/* ------------------------------------------------------------------ */

function CertNewMockBody() {
  return (
    <div className="absolute inset-0 p-4 flex flex-col gap-2.5">
      <div className="flex items-center gap-2 text-[0.6rem] text-white/70">
        <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-blue-300">施工内容</span>
        <span className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1">車両</span>
        <span className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1">材料</span>
        <span className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1">写真</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-1">
        <Field label="施工メニュー" value="ガラスコーティング" />
        <Field label="車両" value="TOYOTA Alphard 2024" />
        <Field label="施工日" value="2026.04.28" />
        <Field label="保証期間" value="5 年間" />
      </div>
      <div className="rounded-md border border-dashed border-white/[0.12] bg-white/[0.02] p-3 text-[0.6rem] text-white/70 text-center">
        施工写真をドラッグ&ドロップ
      </div>
      <div className="mt-auto flex justify-end gap-2">
        <span className="rounded-md border border-white/[0.1] px-3 py-1.5 text-[0.65rem] text-white/80">
          下書き保存
        </span>
        <span className="rounded-md bg-blue-500/80 px-3 py-1.5 text-[0.65rem] text-white">証明書を発行</span>
      </div>
    </div>
  );
}

function CertShareMockBody() {
  return (
    <div className="absolute inset-0 p-4 grid grid-cols-5 gap-3">
      <div className="col-span-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
        <div className="text-[0.55rem] uppercase tracking-widest text-white/70">施工証明書</div>
        <div className="mt-1 text-[0.7rem] font-bold text-white">Toyota Alphard 2024</div>
        <div className="mt-3 space-y-1.5 text-[0.6rem] text-white/80">
          <div className="flex justify-between border-b border-white/[0.06] pb-1">
            <span className="text-white/70">施工内容</span>
            <span>ガラスコーティング</span>
          </div>
          <div className="flex justify-between border-b border-white/[0.06] pb-1">
            <span className="text-white/70">施工日</span>
            <span>2026.04.28</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">保証</span>
            <span>5 年間</span>
          </div>
        </div>
      </div>
      <div className="col-span-2 flex flex-col items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
        <div className="grid grid-cols-5 gap-px w-16 h-16">
          {Array.from({ length: 25 }).map((_, i) => (
            <span key={i} className="aspect-square" style={{ background: i % 3 === 0 ? "#fff" : "transparent" }} />
          ))}
        </div>
        <div className="mt-2 text-[0.55rem] text-white/70">QR で共有</div>
        <div className="mt-2 rounded bg-white/10 px-2 py-1 text-[0.55rem] font-mono text-white/80">ledra.app/v/...</div>
      </div>
    </div>
  );
}

function DashboardMockBody() {
  return (
    <div className="absolute inset-0 p-4 flex flex-col gap-3">
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "今月発行", value: "82", delta: "+12" },
          { label: "保険照会", value: "147", delta: "+24" },
          { label: "売上", value: "¥1.24M", delta: "+8.4%" },
          { label: "NPS", value: "4.8", delta: "/5.0" },
        ].map((k) => (
          <div key={k.label} className="rounded-md border border-white/[0.06] bg-white/[0.02] p-2">
            <div className="text-[0.5rem] uppercase tracking-wider text-white/70">{k.label}</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-[0.85rem] font-bold text-white">{k.value}</span>
              <span className="text-[0.55rem] text-emerald-300">{k.delta}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex-1 rounded-md border border-white/[0.06] bg-white/[0.02] p-2.5">
        <svg viewBox="0 0 320 100" className="w-full h-full">
          <defs>
            <linearGradient id="wycd-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(96,165,250,0.5)" />
              <stop offset="100%" stopColor="rgba(96,165,250,0)" />
            </linearGradient>
          </defs>
          <path d="M0,75 L60,60 L120,68 L180,45 L240,32 L320,18 L320,100 L0,100 Z" fill="url(#wycd-area)" />
          <path
            d="M0,75 L60,60 L120,68 L180,45 L240,32 L320,18"
            fill="none"
            stroke="rgba(96,165,250,0.9)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}

function ListMockBody({ label, rows }: { label: string; rows: string[] }) {
  return (
    <div className="absolute inset-0 p-4 flex flex-col gap-2">
      <div className="text-[0.6rem] font-bold text-white">{label}</div>
      <ul className="flex-1 space-y-1.5">
        {rows.map((r, i) => (
          <li
            key={i}
            className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[0.6rem] text-white/80 truncate"
          >
            {r}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5">
      <div className="text-[0.5rem] uppercase tracking-wider text-white/70">{label}</div>
      <div className="mt-0.5 text-[0.65rem] text-white">{value}</div>
    </div>
  );
}
