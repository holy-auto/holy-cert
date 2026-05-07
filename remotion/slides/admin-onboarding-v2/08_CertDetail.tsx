import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const AdminV2CertDetail: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/admin/cert-detail.png"
      step="確認 3"
      title="証明書詳細 — 出力と画像管理"
      description="証明書詳細では、車両情報・施工内容・添付画像・編集履歴が一画面で確認できます。「PDF」ボタンから施工証明書 PDF を 1 件単位で出力でき、画像セクションから施工写真の追加・削除も可能です。"
      subtext="添付画像は Polygon ブロックチェーンに改ざん検知用ハッシュが記録されます。"
    />
  </AbsoluteFill>
);
