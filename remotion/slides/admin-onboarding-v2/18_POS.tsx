import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const AdminV2POS: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/admin/pos.png"
      step="手順 1"
      title="POS会計"
      description="「POS」メニューでは店頭での会計を Ledra 上で完結できます。未会計の予約から対象を選び、品目を追加すると合計金額が自動計算されます。決済方法は現金・カード（Stripe Terminal）・QRコード・銀行振込から選べます。"
      subtext="決済完了後は領収書がお客様にメール送信されます。"
    />
  </AbsoluteFill>
);
