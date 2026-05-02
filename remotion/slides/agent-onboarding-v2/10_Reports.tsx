import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const AgentV2Reports: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/agent/commissions.png"
      step="確認 2"
      title="実績レポート"
      description="「レポート」タブでは月別・四半期別の実績グラフが確認できます。自分のランキングポジション・達成率・目標との差分が表示されます。PDF形式でダウンロードして、実績資料として活用できます。"
      subtext="キャンペーン期間中はボーナス報酬のシミュレーション機能も利用できます。"
    />
  </AbsoluteFill>
);
