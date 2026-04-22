import { makeOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/marketing/og";

export const alt = "導入支援・サポート | Ledra";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return makeOgImage({
    badge: "SUPPORT",
    title: "導入から定着まで、担当チームが伴走します。",
    subtitle: "データ移行・初期設定・現場教育・本番運用まで。",
  });
}
