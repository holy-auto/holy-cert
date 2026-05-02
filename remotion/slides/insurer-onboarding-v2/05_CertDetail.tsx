import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const InsurerV2CertDetail: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/insurer/cert-detail.png"
      step="確認 2"
      title="証明書の詳細確認"
      description="証明書詳細では、整備日・作業内容・使用部品・施工店情報・写真・QRコードが確認できます。QRコードをスキャンするとブロックチェーン検証ページが開き、改ざんがないことを確認できます。"
      subtext="証明書は第三者認証を受けたブロックチェーン（Hyperledger）に記録されています。"
    />
  </AbsoluteFill>
);
