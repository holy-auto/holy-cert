import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const AdminV2DashboardWidgets: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/admin/dashboard.png"
      step="確認 2"
      title="ダッシュボード — 今日のタスクとクイックアクション"
      description="ダッシュボード中央には「今日のタスク」ウィジェットがあり、本日処理が必要な予約・受付・整備が一箇所に集約されます。上部のクイックアクションから、証明書発行 / 飛び込み案件 / 顧客追加 / 請求書 / プラン管理 へワンクリックで移動できます。"
      subtext="店舗統計はダッシュボード下部、月次の発行件数・売上推移は店舗統計セクションで確認できます。"
    />
  </AbsoluteFill>
);
