import { makeOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/marketing/og";

export const alt = "Ledra 料金プラン";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return makeOgImage({
    badge: "PRICING",
    title: "シンプルで透明な料金体系",
    subtitle: "施工店の規模に合わせた4つのプラン。まずは無料から始められます。",
  });
}
