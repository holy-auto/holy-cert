import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "HOLY-CERT — WEB施工証明書 & HolyMarket",
    template: "%s | HOLY-CERT",
  },
  description: "施工証明書のデジタル化と、BtoB中古車在庫共有を一つのプラットフォームで。",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "HOLY-CERT",
    title: "HOLY-CERT — WEB施工証明書 & HolyMarket",
    description: "施工証明書のデジタル化と、BtoB中古車在庫共有を一つのプラットフォームで。",
  },
  twitter: {
    card: "summary",
    title: "HOLY-CERT",
    description: "施工証明書のデジタル化と、BtoB中古車在庫共有を一つのプラットフォームで。",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
