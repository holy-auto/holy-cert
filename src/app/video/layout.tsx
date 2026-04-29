import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-noto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ledra — WEB施工証明書SaaS | 説明会",
  description: "Ledra 説明会プレゼンテーション",
  robots: { index: false, follow: false },
};

export default function VideoLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={`${notoSansJP.variable} font-[family-name:var(--font-noto)]`}>
        {children}
      </body>
    </html>
  );
}
