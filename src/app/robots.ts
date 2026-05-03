import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/marketing/config";

export default function robots(): MetadataRoute.Robots {
  // Vercel preview / staging はインデックスから完全除外。Production だけが
  // 通常のサイトマップを公開する。プレビュー URL が SEO に紛れ込んで
  // 顧客の検索結果に出るのを防ぐ。
  const env = process.env.VERCEL_ENV ?? process.env.NEXT_PUBLIC_VERCEL_ENV;
  const isProduction = env === "production" || (!env && process.env.NODE_ENV === "production");

  if (!isProduction) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/insurer/",
          "/customer/",
          "/agent/",
          "/market/",
          "/api/",
          "/auth/",
          "/login",
          "/register",
          "/c/",
          "/.well-known/",
        ],
      },
      // 既知の AI クローラ / scraper を明示的に拒否。content scraping を
      // 防ぎ、コンテンツの無断学習利用を抑制する。
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "OAI-SearchBot",
          "Google-Extended",
          "anthropic-ai",
          "ClaudeBot",
          "CCBot",
          "PerplexityBot",
          "Bytespider",
          "Amazonbot",
        ],
        disallow: "/",
      },
    ],
    sitemap: `${siteConfig.siteUrl}/sitemap.xml`,
    host: siteConfig.siteUrl,
  };
}
