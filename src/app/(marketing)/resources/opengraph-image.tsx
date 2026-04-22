import { makeOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/marketing/og";

export const alt = "資料ダウンロード | Ledra";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return makeOgImage({
    badge: "RESOURCES",
    title: "資料ダウンロード",
    subtitle: "サービス概要・機能紹介・セキュリティ仕様・事例集を無料でお届けします。",
  });
}
