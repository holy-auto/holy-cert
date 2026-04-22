import { makeOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/marketing/og";

export const alt = "セキュリティ | Ledra";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return makeOgImage({
    badge: "SECURITY",
    title: "記録の信頼を、仕組みで守る。",
    subtitle: "暗号化・アクセス制御・バックアップ・脆弱性対応・改ざん防止。",
  });
}
