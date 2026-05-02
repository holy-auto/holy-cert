import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const AgentV2Commissions: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/agent/commissions.png"
      step="確認 1"
      title="報酬の確認"
      description="「報酬」メニューでは確定済み・未確定の報酬の内訳が月別で確認できます。紹介ごとの報酬金額・計算根拠・支払い状況が詳細に表示されます。振込先の銀行口座はここから設定・変更できます。"
      subtext="明細は毎月1日に確定し、PDFでダウンロードできます。"
    />
  </AbsoluteFill>
);
