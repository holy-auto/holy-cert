import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const AdminV2Billing: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/admin/billing.png"
      step="確認 2"
      title="請求・プラン管理"
      description="「請求・プラン」では Ledra の利用プラン（Starter / Standard / Pro）の選択・変更ができます。各プランの月額・証明書発行可能数・利用機能・写真上限を比較し、変更すると Stripe Checkout で即時切り替わります。"
      subtext="次回請求日・支払い履歴・領収書ダウンロードは Stripe カスタマーポータルから確認できます。"
    />
  </AbsoluteFill>
);
