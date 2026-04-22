import { makeOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/marketing/og";

export const alt = "ROIシミュレーター | Ledra";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return makeOgImage({
    badge: "ROI",
    title: "数字で見る、Ledra の効果。",
    subtitle: "月間発行数・事務時間・再発行コストから、年間削減額を推定します。",
  });
}
