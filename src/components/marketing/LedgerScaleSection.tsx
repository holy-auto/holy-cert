import { Section } from "./Section";
import { SectionHeading } from "./SectionHeading";
import { ScrollReveal } from "./ScrollReveal";
import { ScreenshotFrame } from "./ScreenshotFrame";

/**
 * LedgerScaleSection — 車両・顧客の台帳機能を、SmartHR 風の左右交互レイアウトで深掘り。
 *
 * 現場の発行が増えるほど、車両台帳・顧客台帳が自動で蓄積される、というスケールの訴求。
 * WhatYouCanDoSection の "Vehicle / Customer" カードが詳細ビュー (タイムライン, 360)
 * を見せるのに対し、本セクションは「一覧」での網羅性・規模感を見せる。
 */
export function LedgerScaleSection() {
  return (
    <Section bg="alt" id="ledger">
      <SectionHeading
        title="車両・顧客台帳が、毎日の業務から自動で育つ"
        subtitle="証明書を発行するたびに、台帳に蓄積。検索・絞り込みも一画面から。"
      />

      <div className="space-y-20 md:space-y-28">
        {/* Row 1 — 車両管理 (image left, copy right) */}
        <SplitRow
          eyebrow="車両管理"
          title="車両ごとに、施工履歴の母艦をつくる。"
          description="登録された車両を 1 画面で検索・絞り込み。詳細ページからそのまま証明書発行に進めます。"
          bullets={[
            "ナンバー / VIN / 車種で横断検索",
            "車両ごとに施工・予約・NFC を統合",
            "1 タップで証明書発行に遷移",
          ]}
          image={{
            src: "/marketing/screenshots/09-vehicles-list.png",
            alt: "車両管理 一覧画面",
            url: "admin.ledra.app/vehicles",
          }}
          imageOnLeft
        />

        {/* Row 2 — 顧客管理 (copy left, image right) */}
        <SplitRow
          eyebrow="顧客管理"
          title="顧客リストから、関係性をまるごと把握。"
          description="顧客ごとの証明書数・最終来店日が一覧で見える。リピート判定で次の提案にもつながります。"
          bullets={["顧客ごとの証明書数・最終来店", "氏名 / メール / 電話で横断検索", "CSV で CRM とも連携可能"]}
          image={{
            src: "/marketing/screenshots/10-customers-list.png",
            alt: "顧客管理 一覧画面",
            url: "admin.ledra.app/customers",
          }}
          imageOnLeft={false}
        />
      </div>
    </Section>
  );
}

function SplitRow({
  eyebrow,
  title,
  description,
  bullets,
  image,
  imageOnLeft,
}: {
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  image: { src: string; alt: string; url: string };
  imageOnLeft: boolean;
}) {
  const imageOrder = imageOnLeft ? "md:order-1" : "md:order-2";
  const copyOrder = imageOnLeft ? "md:order-2" : "md:order-1";

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-14 items-center">
      <ScrollReveal variant={imageOnLeft ? "fade-right" : "fade-left"} className={`md:col-span-7 ${imageOrder}`}>
        <ScreenshotFrame src={image.src} alt={image.alt} url={image.url} sizes="(min-width: 768px) 56vw, 100vw" />
      </ScrollReveal>

      <ScrollReveal
        variant={imageOnLeft ? "fade-left" : "fade-right"}
        delay={120}
        className={`md:col-span-5 ${copyOrder}`}
      >
        <div>
          <span className="text-[0.688rem] font-medium uppercase tracking-widest text-blue-300">{eyebrow}</span>
          <h3 className="mt-3 text-[1.5rem] md:text-[1.75rem] font-bold leading-[1.3] tracking-tight text-white">
            {title}
          </h3>
          <p className="mt-4 text-[0.938rem] leading-relaxed text-white">{description}</p>
          <ul className="mt-6 space-y-3">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm text-white">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {b}
              </li>
            ))}
          </ul>
        </div>
      </ScrollReveal>
    </div>
  );
}
