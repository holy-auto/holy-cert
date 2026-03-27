import { Container } from "@/components/marketing/Container";
import { CountdownTimer } from "@/components/marketing/CountdownTimer";
import Link from "next/link";

const portalLinks = [
  {
    label: "施工店",
    href: "/login",
    signupHref: "/signup",
    signupLabel: "新規登録",
    description: "証明書の作成・管理",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    label: "代理店",
    href: "/agent/login",
    description: "紹介・コミッション管理",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    label: "保険会社",
    href: "/insurer/login",
    signupHref: "/join",
    signupLabel: "新規登録",
    description: "証明書の確認・査定",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
];

const roleCtaItems = [
  {
    label: "施工店の方",
    href: "/for-shops",
    documentHref: "/contact/shops",
    description: "証明書発行の効率化と顧客満足度の向上",
  },
  {
    label: "代理店の方",
    href: "/for-agents",
    documentHref: "/contact/agents",
    description: "パートナープログラムで安定した収益を",
  },
  {
    label: "保険会社の方",
    href: "/for-insurers",
    documentHref: "/contact/insurers",
    description: "査定業務の精度とスピードを同時に向上",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero section */}
      <section className="relative overflow-hidden bg-[#060a12] min-h-[80vh] flex items-center">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] bg-blue-600/20 rounded-full blur-[150px] animate-[float_10s_ease-in-out_infinite]" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-blue-400/15 rounded-full blur-[130px] animate-[float_12s_ease-in-out_infinite_reverse]" />
          <div className="absolute top-[40%] left-[50%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] animate-[pulse-soft_8s_ease-in-out_infinite]" />
          <div className="absolute top-[-5%] right-[10%] w-[400px] h-[400px] bg-violet-600/15 rounded-full blur-[130px] animate-[float_14s_ease-in-out_infinite_1s]" />

          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(79,156,247,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(79,156,247,0.3) 1px, transparent 1px)",
              backgroundSize: "80px 80px",
              maskImage:
                "radial-gradient(ellipse 80% 60% at 50% 50%, black 20%, transparent 70%)",
              WebkitMaskImage:
                "radial-gradient(ellipse 80% 60% at 50% 50%, black 20%, transparent 70%)",
            }}
          />
        </div>

        <Container className="relative text-center py-28 md:py-36">
          {/* Badge */}
          <div className="animate-[hero-fade-in_0.7s_ease-out_0.15s_both]">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium text-blue-300 bg-blue-500/10 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-[pulse-soft_2s_ease-in-out_infinite]" />
              2026.04.01 Launch
            </div>
          </div>

          {/* Title */}
          <h1 className="mt-10">
            <span className="block text-[2.5rem] md:text-[3.75rem] lg:text-[4.5rem] font-bold leading-[1.1] tracking-tight text-white animate-[hero-fade-up_0.8s_ease-out_0.3s_both]">
              施工証明をデジタルで。
            </span>
            <span className="block mt-2 text-[2.5rem] md:text-[3.75rem] lg:text-[4.5rem] font-bold leading-[1.1] tracking-tight bg-gradient-to-r from-[#60a5fa] via-[#a78bfa] to-[#60a5fa] bg-clip-text text-transparent animate-[hero-fade-up_0.8s_ease-out_0.5s_both] bg-[length:200%_auto]">
              信頼を、かんたんに。
            </span>
          </h1>

          <p className="mt-8 text-lg md:text-xl leading-relaxed text-white/50 max-w-2xl mx-auto animate-[hero-fade-up_0.8s_ease-out_0.7s_both]">
            CARTRUSTは、自動車の施工記録をデジタル証明書として発行・管理できるプラットフォームです。
            <br className="hidden md:block" />
            サービス公開までもう少しお待ちください。
          </p>

          {/* Countdown */}
          <div className="mt-14 animate-[hero-fade-up_0.8s_ease-out_0.9s_both]">
            <CountdownTimer />
          </div>

          {/* CTA */}
          <div className="mt-14 flex flex-col sm:flex-row gap-4 justify-center animate-[hero-fade-up_0.8s_ease-out_1.1s_both]">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center font-medium rounded-lg text-sm px-8 py-4 bg-white text-[#060a12] hover:bg-gray-100 transition-colors shadow-[0_0_30px_rgba(255,255,255,0.1)]"
            >
              無料で始める
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center font-medium rounded-lg text-sm px-8 py-4 border border-white/20 text-white hover:bg-white/10 transition-colors"
            >
              事前お問い合わせ
            </Link>
          </div>

          <p className="mt-6 text-sm text-white/30 animate-[hero-fade-in_0.8s_ease-out_1.3s_both]">
            ローンチ後すぐにご利用いただけるよう、事前のお問い合わせを受け付けています
          </p>
        </Container>
      </section>

      {/* Portal login section */}
      <section className="relative bg-[#0a0f1a] py-16 md:py-20 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
            maskImage: "radial-gradient(ellipse 90% 70% at 50% 50%, black 30%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse 90% 70% at 50% 50%, black 30%, transparent 80%)",
          }}
        />
        <Container className="relative">
          <div className="text-center mb-12">
            <h2 className="text-xl md:text-2xl font-bold text-white">
              ポータルログイン
            </h2>
            <p className="mt-3 text-sm text-white/40">
              ご利用のポータルを選択してログインしてください
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {portalLinks.map((portal) => (
              <div key={portal.href} className="rounded-xl bg-white/[0.04] border border-white/[0.07] p-5 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/[0.1] flex items-center justify-center text-blue-400 group-hover:bg-blue-500/[0.15] transition-colors">
                    {portal.icon}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{portal.label}</div>
                    <div className="text-xs text-white/40">{portal.description}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={portal.href}
                    className="flex-1 text-center text-sm font-medium px-3 py-2 rounded-lg bg-white/[0.08] text-white hover:bg-white/[0.14] transition-colors"
                  >
                    ログイン
                  </Link>
                  {portal.signupHref && (
                    <Link
                      href={portal.signupHref}
                      className="text-center text-sm px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
                    >
                      {portal.signupLabel}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Role-specific CTA section */}
      <section className="relative bg-[#060a12] py-20 md:py-28 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
            maskImage: "radial-gradient(ellipse 90% 70% at 50% 50%, black 30%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse 90% 70% at 50% 50%, black 30%, transparent 80%)",
          }}
        />
        <Container className="relative">
          <div className="text-center mb-14">
            <h2 className="text-[1.75rem] md:text-[2.5rem] font-bold leading-[1.25] tracking-tight text-white">
              あなたに合ったプランを見つける
            </h2>
            <p className="mt-5 text-base text-white/50 max-w-lg mx-auto">
              施工店・代理店・保険会社、それぞれに最適化された機能とサポートをご用意しています
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {roleCtaItems.map((item, i) => (
              <div
                key={item.href}
                className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-6 hover:bg-white/[0.05] hover:border-white/[0.12] transition-all"
                style={{
                  animationName: "hero-fade-up",
                  animationDuration: "700ms",
                  animationDelay: `${i * 120}ms`,
                  animationFillMode: "both",
                  animationTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                <h3 className="text-lg font-bold text-white">{item.label}</h3>
                <p className="mt-2 text-sm text-white/45 leading-relaxed">{item.description}</p>
                <div className="mt-5 flex flex-col gap-2">
                  <Link
                    href={item.href}
                    className="text-center text-sm font-medium px-4 py-2.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors"
                  >
                    詳しく見る
                  </Link>
                  <Link
                    href={item.documentHref}
                    className="text-center text-sm px-4 py-2.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    資料請求
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing link */}
          <div className="mt-12 text-center">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
            >
              料金プラン・機能比較を見る
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
