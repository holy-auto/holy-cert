import Image from "next/image";
import { Section } from "./Section";
import { SectionHeading } from "./SectionHeading";
import { ScrollReveal } from "./ScrollReveal";

/**
 * Integration logo wall — カラーロゴ使用許諾までは、ブランドテキストチップで見せる。
 * 許諾が揃い次第、各アイテムに SVG/画像ロゴを差し替える。
 * `logo` プロパティが指定されているアイテムは画像で、それ以外はテキストで表示する。
 */

type Integration = {
  name: string;
  note?: string;
  /** `/public` 以下からのパス。指定時はテキストではなく画像でロゴを表示する。 */
  logo?: string;
};

const INTEGRATIONS: Integration[] = [
  { name: "Stripe", note: "サブスクリプション・請求書" },
  { name: "Square", note: "POS端末決済・在庫同期" },
  { name: "Google Calendar", note: "予約カレンダー双方向同期" },
  { name: "LINE", note: "顧客通知・リマインド" },
  { name: "Polygon", note: "証明書アンカリング" },
  { name: "Resend", note: "トランザクションメール" },
  { name: "C2PA", note: "写真コンテンツクレデンシャル" },
  { name: "Claude", note: "車検証OCR・写真品質検証・エージェント" },
  {
    name: "NexDiag",
    note: "膜厚計測・コーティング検証",
    logo: "/marketing/integrations/nexdiag.svg",
  },
  { name: "Upstash", note: "分散レート制限・キャッシュ" },
  { name: "Supabase", note: "RLS付きデータ基盤" },
];

export function IntegrationLogoWall() {
  return (
    <Section bg="alt" id="integrations">
      <SectionHeading
        title="既にある現場の道具と、そのままつながる"
        subtitle="Ledra は業務の置き換えを強いません。今使っているPOS・決済・メッセージ・カレンダーと無理なくつなぎ、記録だけをデジタルに変えていきます。"
      />
      <div className="mx-auto mt-12 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-5 max-w-6xl">
        {INTEGRATIONS.map((item, i) => (
          <ScrollReveal key={item.name} variant="fade-up" delay={Math.floor(i / 4) * 60}>
            <div className="group h-full rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 md:p-8 text-center hover:bg-white/[0.06] hover:border-white/[0.14] transition-colors">
              {item.logo ? (
                <div className="flex h-7 md:h-8 items-center justify-center">
                  <Image
                    src={item.logo}
                    alt={item.name}
                    width={140}
                    height={40}
                    className="h-full w-auto object-contain"
                  />
                </div>
              ) : (
                <p className="text-lg md:text-xl font-semibold text-white tracking-tight">{item.name}</p>
              )}
              {item.note && (
                <p className="mt-2.5 text-sm md:text-[0.95rem] leading-relaxed text-white/80">{item.note}</p>
              )}
            </div>
          </ScrollReveal>
        ))}
      </div>
      <p className="mt-10 text-center text-xs text-white/75 leading-relaxed">
        ※ 各サービス名および関連商標は、それぞれの権利者に帰属します。
        <br className="hidden md:block" />
        現在、ロゴ使用許諾については順次交渉を進めており、許諾済みのパートナーから画像ロゴに差し替えていきます。
      </p>
    </Section>
  );
}
