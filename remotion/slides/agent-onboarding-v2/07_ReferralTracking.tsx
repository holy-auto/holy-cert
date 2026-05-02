import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const AgentV2ReferralTracking: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/agent/referrals.png"
      step="確認 3"
      title="紹介URLの共有方法"
      description="各紹介には固有のURLとQRコードが割り当てられます。「コピー」ボタンでURLをクリップボードにコピーするか、「QRコードを表示」で印刷用コードを取得できます。名刺・チラシへの印刷にもご活用ください。"
      subtext="紹介URLのアクセス数・クリック数もリアルタイムで確認できます。"
    />
  </AbsoluteFill>
);
