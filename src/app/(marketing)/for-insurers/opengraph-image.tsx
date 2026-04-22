import { makeOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/marketing/og";

export const alt = "保険会社の方へ | Ledra";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return makeOgImage({
    badge: "FOR INSURERS",
    title: "施工証明の確認を、一瞬で。",
    subtitle: "改ざん検知付きデジタル証明書と、案件・監査・分析のための保険会社ポータル。",
  });
}
