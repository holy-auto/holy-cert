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
      description="ログイン後、ダッシュボードが表示されます。証明書発行数・店舗統計・プラットフォーム統計が一目で確認できます。クイックアクションのカードをクリックすると、対応する作業画面へ直接移動できます。"
      subtext="データは表示時点のテナント情報をもとに集計されます。"
    />
  </AbsoluteFill>
);
