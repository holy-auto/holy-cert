import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const AdminV2CertDetail: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/admin/certs-list.png"
      step="確認 3"
      title="証明書の詳細と印刷"
      description="証明書詳細画面では、作業記録・使用部品・写真・QRコードが確認できます。「印刷」ボタンで顧客向けの証明書PDF・ステッカーを出力できます。「共有」ボタンでURLリンクをお客様にメッセージ送信することも可能です。"
      subtext="証明書は改ざん防止のためブロックチェーンに記録されます。"
    />
  </AbsoluteFill>
);
