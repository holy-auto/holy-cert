import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const AgentV2ReferralList: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/agent/referrals.png"
      step="確認 1"
      title="紹介一覧"
      description="「紹介」メニューでは紹介したお客様の一覧と各ステータスが確認できます。「申込中」「審査通過」「契約済」「報酬確定」などのステータスで進捗を追跡できます。"
      subtext="各紹介のステータスが変わるとメール・プッシュ通知でお知らせします。"
    />
  </AbsoluteFill>
);
