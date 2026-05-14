import Image from "next/image";
import { Section } from "./Section";
import { SectionHeading } from "./SectionHeading";
import { ScrollReveal } from "./ScrollReveal";

/**
 * Integration logo wall — カラーロゴ使用許諾までは、ブランドテキストチップで見せる。
 * 許諾が揃い次第、各アイテムに SVG/画像ロゴを差し替える。
 */

type Integration = {
  name: string;
  note?: string;
  logo?: {
    src: string;
    width: number;
    height: number;
  };
};

const INTEGRATIONS: Integration[] = [
  { name: "Stripe", note: "サブスクリプション・請求書" },
  { name: "Square", note: "POS端末決済・在庫同期" },
  { name: "Google Calendar", note: "予約カレンダー双方向同期" },
  {
    name: "LINE",
    note: "顧客通知・リマインド",
    logo: { src: "/brands/LINE_Brand_icon.png", width: 1001, height: 1000 },
  },
  {
    name: "Polygon",
    note: "証明書アンカリング",
    logo: { src: "/brands/Polygon_Logo_HiRes.png", width: 2915, height: 802 },
  },
  {
    name: "Resend",
    note: "トランザクションメール",
    logo: { src: "/brands/resend-wordmark-white.svg", width: 1978, height: 420 },
  },
  { name: "C2PA", note: "写真コンテンツクレデンシャル" },
  { name: "Claude", note: "車検証OCR・写真品質検証・エージェント" },
  { name: "NexPTG", note: "膜厚計測・コーティング検証" },
  {
    name: "Upstash",
    note: "分散レート制限・キャッシュ",
    logo: { src: "/brands/upstash-dark-bg.svg", width: 1631, height: 472 },
  },
  {
    name: "Supabase",
    note: "RLS付きデータ基盤",
    logo: { src: "/brands/supabase-logo-wordmark--dark.svg", width: 581, height: 113 },
  },
];

export function IntegrationLogoWall() {
  return (
    <Section bg="alt" id="integrations">
      <SectionHeading
        title="既にある現場の道具と、そのままつながる"
        subtitle="Ledra は業務の置き換えを強いません。今使っているPOS・決済・メッセージ・カレンダーと無理なくつなぎ、記録だけをデジタルに変えていきます。"
      />
      <div className="mx-auto mt-12 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4 max-w-5xl">
        {INTEGRATIONS.map((item, i) => (
          <ScrollReveal key={item.name} variant="fade-up" delay={Math.floor(i / 4) * 60}>
            <div className="group h-full rounded-2xl border border-white/[0.14] bg-white/[0.06] p-5 md:p-6 text-center hover:bg-white/[0.10] hover:border-white/[0.22] transition-colors flex flex-col items-center justify-center">
              {item.logo ? (
                <div className="flex h-8 md:h-9 items-center justify-center">
                  <Image
                    src={item.logo.src}
                    alt={`${item.name} logo`}
                    width={item.logo.width}
                    height={item.logo.height}
                    className="h-full w-auto object-contain"
                    sizes="(min-width: 768px) 180px, 140px"
                  />
                </div>
              ) : (
                <p className="text-base md:text-lg font-semibold text-white tracking-tight">{item.name}</p>
              )}
              {item.note && <p className="mt-2 text-xs leading-relaxed text-white">{item.note}</p>}
            </div>
          </ScrollReveal>
        ))}
      </div>
      <p className="mt-10 text-center text-sm text-white leading-relaxed">
        ※ 各サービス名および関連商標は、それぞれの権利者に帰属します。
        <br className="hidden md:block" />
        現在、ロゴ使用許諾については順次交渉を進めており、許諾済みのパートナーから画像ロゴに差し替えていきます。
      </p>
      <ul className="mx-auto mt-4 max-w-3xl space-y-1 text-center text-xs text-white/80 leading-relaxed">
        <li>LINE、LINEのロゴは、LINEヤフー株式会社の登録商標または商標です。</li>
        <li>Polygon は Polygon Labs UI Labs Limited およびその関連会社の商標です。</li>
        <li>Resend は Resend, Inc. の商標です。</li>
        <li>Upstash は Upstash, Inc. の商標です。</li>
        <li>Supabase は Supabase Inc. の登録商標または商標です。</li>
      </ul>
    </Section>
  );
}
