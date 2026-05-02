import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const AdminV2DashboardWidgets: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/admin/dashboard.png"
      step="確認 2"
      title="ダッシュボード — ウィジェットの活用"
      description="ダッシュボードには売上グラフ・最近の証明書・未対応の予約・整備案件の一覧ウィジェットが並んでいます。ウィジェットをドラッグして並び替えることで、自分の業務に合ったレイアウトにカスタマイズできます。"
      subtext="右上の「ウィジェット追加」ボタンから新しいウィジェットを追加できます。"
    />
  </AbsoluteFill>
);
