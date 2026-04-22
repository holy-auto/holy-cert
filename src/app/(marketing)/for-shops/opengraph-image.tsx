import { makeOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/marketing/og";

export const alt = "施工店の方へ | Ledra";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return makeOgImage({
    badge: "FOR SHOPS",
    title: "施工の技術を、証明に変える。",
    subtitle: "コーティング・フィルム・ラッピング。一件一件の仕事を、信頼に積み上げる。",
  });
}
