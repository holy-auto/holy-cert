import { PageHero } from "@/components/marketing/PageHero";
import { Section } from "@/components/marketing/Section";
import { CTABanner } from "@/components/marketing/CTABanner";
import { CTAButton } from "@/components/marketing/CTAButton";

export const metadata = {
  title: "イベント・ウェビナー",
  description:
    "Ledra が主催・共催するイベント、ウェビナー、導入相談会の情報をお届けします。",
  alternates: { canonical: "/events" },
};

export default function EventsPage() {
  return (
    <>
      <PageHero
        badge="EVENTS"
        title="イベント・ウェビナー"
        subtitle="施工店・代理店・保険会社の実務者に向けたウェビナーや導入相談会を、順次開催してまいります。"
      />

      <Section>
        <div className="mx-auto max-w-2xl rounded-2xl border border-white/[0.08] bg-white/[0.03] p-10 md:p-14 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium text-blue-300 bg-blue-500/10 border border-blue-500/20">
            COMING SOON
          </div>
          <h2 className="mt-6 text-2xl md:text-3xl font-bold text-white leading-tight">
            次回イベント、準備中です。
          </h2>
          <p className="mt-5 text-[0.938rem] md:text-base leading-[1.9] text-white/60 max-w-xl mx-auto">
            ウェビナー・導入相談会の開催日程が決まり次第、本ページとメルマガでご案内いたします。
            <br />
            個別のご相談ご希望の方は、お問い合わせよりご連絡ください。
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-3">
            <CTAButton variant="primary" href="/contact" trackLocation="events-coming-soon">
              個別相談を申し込む
            </CTAButton>
            <CTAButton variant="outline" href="/resources" trackLocation="events-coming-soon">
              資料ダウンロード
            </CTAButton>
          </div>
        </div>
      </Section>

      <CTABanner
        title="開催情報をいち早くお届けします"
        subtitle="フッターのメルマガ登録をお願いいたします。開催予定・録画アーカイブをご案内します。"
        primaryLabel="お問い合わせ"
        primaryHref="/contact"
        secondaryLabel="導入支援を見る"
        secondaryHref="/support"
      />
    </>
  );
}
