import { makeOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/marketing/og";

export const alt = "代理店の方へ | Ledra";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return makeOgImage({
    badge: "FOR AGENTS",
    title: "紹介で、業界の標準を一緒に作る。",
    subtitle: "Ledra パートナープログラム。一度の紹介が継続報酬になる代理店の仕組み。",
  });
}
