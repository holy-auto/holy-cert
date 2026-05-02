import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const AdminV2Reservations: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/admin/reservations.png"
      step="確認 1"
      title="予約一覧"
      description="「予約」メニューでは本日・今週の予約がカレンダーと一覧形式で確認できます。予約をクリックすると詳細が表示されます。状況に応じて「確認済」「作業中」「完了」などのステータスを更新できます。"
      subtext="お客様がオンラインで予約した内容も自動的にここに表示されます。"
    />
  </AbsoluteFill>
);
