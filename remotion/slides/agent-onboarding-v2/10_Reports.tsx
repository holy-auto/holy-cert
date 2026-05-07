import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const AgentV2Reports: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/agent/reports.png"
      step="確認 2"
      title="レポート・分析"
      description="「レポート・分析」では月別の紹介件数推移と、ステータス別の内訳をグラフで確認できます。獲得した報酬や成約率の傾向を時系列で把握できます。"
      subtext="数値はリアルタイムで更新されるので、月途中の進捗確認にも使えます。"
    />
  </AbsoluteFill>
);
