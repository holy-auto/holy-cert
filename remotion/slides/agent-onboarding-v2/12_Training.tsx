import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const AgentV2Training: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/agent/training.png"
      step="確認 1"
      title="トレーニング・学習コンテンツ"
      description="「トレーニング」メニューでは紹介活動のコツ・商品知識・よくある質問への対応方法を学習できます。動画・PDF・クイズ形式のコンテンツが用意されており、修了するとバッジが付与されます。"
      subtext="トレーニング修了によって報酬単価がアップするインセンティブ制度があります。"
    />
  </AbsoluteFill>
);
