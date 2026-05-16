import { makeOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/marketing/og";

export const alt = "透明性ダッシュボード | Ledra";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return makeOgImage({
    badge: "TRANSPARENCY DASHBOARD",
    title: "私たちは、自分の数字も隠しません。",
    subtitle: "証明書発行数・解約率・公開ロードマップ・障害情報・失敗事例まで率直に開示します。",
  });
}
