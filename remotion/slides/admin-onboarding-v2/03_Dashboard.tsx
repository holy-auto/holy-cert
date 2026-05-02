import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const AdminV2Dashboard: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/admin/dashboard.png"
      step="確認 1"
      title="ダッシュボード — 全体の把握"
      description="ログイン後、ダッシュボードが表示されます。本日の売上・証明書発行数・予約件数などの主要KPIが一目で確認できます。各カードをクリックすると詳細一覧へ移動します。"
      subtext="データは毎日自動集計されます。右上のアイコンから期間フィルターを変更できます。"
    />
  </AbsoluteFill>
);
