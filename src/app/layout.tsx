import "./globals.css";
import { Geist_Mono } from "next/font/google";
import { Noto_Sans_JP } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "@/lib/theme/ThemeContext";
import { cookies } from "next/headers";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans",
  display: "swap",
});

export const metadata = {
  title: "CARTRUST",
  description: "WEB施工証明書SaaS",
};

/** Inline script to prevent flash of wrong theme on load */
const THEME_INIT_SCRIPT = `(function(){try{var c=document.cookie.match(/__theme=(light|dark)/);if(c)document.documentElement.setAttribute('data-theme',c[1]);else{var d=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';document.documentElement.setAttribute('data-theme',d)}}catch(e){}})()`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("__theme")?.value;
  const initialTheme = themeCookie === "dark" ? "dark" : undefined;

  return (
    <html
      lang="ja"
      className={`${geistMono.variable} ${notoSansJP.variable}`}
      data-theme={initialTheme}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="bg-base text-primary antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
