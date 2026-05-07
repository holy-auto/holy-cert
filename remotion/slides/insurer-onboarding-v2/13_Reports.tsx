import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const InsurerV2Reports: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/insurer/reports.png"
      step="手順 2"
      title="案件レポート — 月次/週次の傾向分析"
      description="「レポート」では案件の推移をグラフで確認できます。月次/週次の切替、ステータス別・カテゴリ別の構成比、平均解決時間、対応済み件数の集計が一画面で見られます。"
      subtext="案件 API 直結で集計するため、最新のチケット状況がそのまま反映されます。"
    />
  </AbsoluteFill>
);
