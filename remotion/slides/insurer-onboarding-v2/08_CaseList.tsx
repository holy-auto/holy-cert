import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const InsurerV2CaseList: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/insurer/cases.png"
      step="確認 1"
      title="事案一覧"
      description="「事案」メニューでは全事案の一覧が表示されます。未対応・対応中・解決済みのステータスでフィルターができます。各事案には優先度・担当者・期限が設定でき、SLAアラートで期限切れを通知します。"
      subtext="事案一覧はCSV・PDFでエクスポートできます。"
    />
  </AbsoluteFill>
);
