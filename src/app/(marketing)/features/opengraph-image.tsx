import { makeOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/marketing/og";

export const alt = "機能一覧 | Ledra";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return makeOgImage({
    badge: "FEATURES",
    title: "記録と信頼を、一つのプラットフォームで。",
    subtitle: "証明書発行から保険・代理店・顧客との連携、経営分析までをLedra一つに。",
  });
}
