import { makeOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/marketing/og";

export const alt = "Ledra よくある質問";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return makeOgImage({
    badge: "FAQ",
    title: "よくある質問",
    subtitle: "サービス内容・料金・導入方法など、よくあるご質問をまとめました。",
  });
}
