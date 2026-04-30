import { makeOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/marketing/og";

export const alt = "財務計画と資金使途の透明性 | Ledra";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return makeOgImage({
    badge: "FINANCIAL TRANSPARENCY",
    title: "お預かりする資金の流れを、率直に開示します。",
    subtitle: "財務運営の原則・資金使途・料金設計・ランウェイ開示・データの非資産化。",
  });
}
