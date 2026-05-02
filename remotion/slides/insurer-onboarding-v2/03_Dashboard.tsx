import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const InsurerV2Dashboard: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/insurer/dashboard.png"
      step="確認 1"
      title="ダッシュボード — 業務の全体像"
      description="ログイン後に表示されるダッシュボードでは、本日の照会件数・新着事案・未対応事案数がひと目で確認できます。グラフでは照会件数の推移と事案の進捗状況を確認できます。"
      subtext="ダッシュボードのデータは30分ごとに更新されます。"
    />
  </AbsoluteFill>
);
