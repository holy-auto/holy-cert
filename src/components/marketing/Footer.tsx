import Link from "next/link";
import { Container } from "./Container";

const footerLinks = [
  {
    title: "サービス",
    links: [
      { label: "料金プラン", href: "/pricing" },
      { label: "施工店の方へ", href: "/for-shops" },
      { label: "代理店の方へ", href: "/for-agents" },
      { label: "保険会社の方へ", href: "/for-insurers" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    title: "ポータル",
    links: [
      { label: "施工店ログイン", href: "/login" },
      { label: "代理店ポータル", href: "/agent/login" },
      { label: "保険会社ポータル", href: "/insurer/login" },
      { label: "新規登録（施工店）", href: "/signup" },
      { label: "新規登録（保険会社）", href: "/join" },
    ],
  },
  {
    title: "資料請求",
    links: [
      { label: "加盟店向け資料", href: "/contact/shops" },
      { label: "代理店向け資料", href: "/contact/agents" },
      { label: "保険会社向け資料", href: "/contact/insurers" },
      { label: "お問い合わせ", href: "/contact" },
    ],
  },
  {
    title: "法的情報",
    links: [
      { label: "利用規約", href: "/terms" },
      { label: "プライバシーポリシー", href: "/privacy" },
      { label: "特定商取引法に基づく表記", href: "/tokusho" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-[#0f1117] text-white">
      <Container>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 md:gap-12 py-20 md:py-24">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="text-lg font-bold tracking-tight">
              CARTRUST
            </Link>
            <p className="mt-4 text-sm text-white/40 leading-relaxed max-w-[200px]">
              施工証明をデジタルで。
              <br />
              信頼を、かんたんに。
            </p>
          </div>

          {/* Link columns */}
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-medium text-white/40 uppercase tracking-widest mb-5">
                {group.title}
              </h3>
              <ul className="space-y-3.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/60 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="py-6 border-t border-white/[0.06]">
          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} CARTRUST. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}
