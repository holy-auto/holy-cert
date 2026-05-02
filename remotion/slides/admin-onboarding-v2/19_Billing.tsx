import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const AdminV2Billing: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/admin/billing.png"
      step="確認 2"
      title="請求・売上管理"
      description="「請求」メニューでは月次の売上レポート・未収金一覧・請求書の発行・管理ができます。フィルターで期間・スタッフ・作業種別ごとに集計できます。データはCSV・PDFでエクスポート可能です。"
      subtext="会計ソフト（弥生・freee等）へのエクスポート形式も選択できます。"
    />
  </AbsoluteFill>
);
