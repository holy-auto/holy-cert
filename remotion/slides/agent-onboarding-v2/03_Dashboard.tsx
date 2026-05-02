import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const AgentV2Dashboard: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/agent/dashboard.png"
      step="確認 1"
      title="ダッシュボード — 活動サマリー"
      description="ダッシュボードでは今月の紹介件数・審査通過数・獲得報酬額がひと目で確認できます。紹介ごとの進捗状況と直近の活動履歴も表示されます。"
      subtext="報酬は毎月月末に確定し、翌月25日に振り込まれます。"
    />
  </AbsoluteFill>
);
