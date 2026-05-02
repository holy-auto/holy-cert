import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const InsurerV2Analytics: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/insurer/dashboard.png"
      step="確認 1"
      title="分析ダッシュボード"
      description="「分析」メニューでは照会件数・事案解決率・平均対応時間などのKPIをグラフで確認できます。期間・担当者・地域でフィルターして傾向を分析できます。"
      subtext="データは毎日00:00に更新されます。90日以上のデータ保持期間があります。"
    />
  </AbsoluteFill>
);
