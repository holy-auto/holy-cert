import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const AgentV2ReferralTracking: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/agent/referral-links.png"
      step="確認 3"
      title="紹介リンク・QRコードの発行"
      description="「紹介リンク」では営業先で使える専用 URL とそれに対応する QR コードを発行できます。リンクはワンクリックでクリップボードにコピーでき、QR コードは PNG でダウンロードできます。名刺やチラシへの印刷にも活用できます。"
      subtext="リンクごとに用途別ラベルを付けて管理できます。"
    />
  </AbsoluteFill>
);
