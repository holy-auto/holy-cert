import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const AdminV2CustomerDetail: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/admin/customers-detail.png"
      step="確認 2"
      title="お客様詳細 — 360°ビュー"
      description="お客様詳細ページでは、保有車両・整備履歴・発行済み証明書・予約履歴が一画面で確認できます。「連絡」ボタンからSMS・メールを直接送信することもできます。"
      subtext="顧客カルテとして活用することで、スタッフが変わっても継続したサービスを提供できます。"
    />
  </AbsoluteFill>
);
