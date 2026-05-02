import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const AdminV2POS: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/admin/pos.png"
      step="手順 1"
      title="POS決済"
      description="「POS」メニューでは店頭での決済を処理できます。整備案件を選択して部品・作業を追加すると自動的に合計金額が計算されます。Square端末と連携しているので、クレジットカード・電子マネー・QRコード決済が可能です。"
      subtext="領収書はメールまたは印刷でお客様に発行できます。"
    />
  </AbsoluteFill>
);
