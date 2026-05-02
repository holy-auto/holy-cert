import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const InsurerV2Reports: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/insurer/certs.png"
      step="手順 2"
      title="レポートのエクスポート"
      description="「レポート」から月次・週次レポートをPDF・Excel形式でエクスポートできます。テンプレートをカスタマイズして、自社の書式に合わせたレポートを作成できます。スケジュール設定で自動メール送信も可能です。"
      subtext="エクスポートしたデータは社内システムへのインポートにも使用できます。"
    />
  </AbsoluteFill>
);
