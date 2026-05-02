import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const AgentV2Materials: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/agent/training.png"
      step="確認 2"
      title="営業素材のダウンロード"
      description="「素材」タブでは紹介活動に使えるパンフレット・説明用スライド・ポスターデータをダウンロードできます。すべてのデータはPDF・PNG形式で提供され、印刷してお使いいただけます。"
      subtext="素材の二次改変・無断転載は禁止されています。詳細は利用規約をご確認ください。"
    />
  </AbsoluteFill>
);
