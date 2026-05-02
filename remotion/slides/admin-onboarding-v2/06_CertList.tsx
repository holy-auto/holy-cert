import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const AdminV2CertList: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/admin/certs-list.png"
      step="手順 1"
      title="証明書一覧を開く"
      description="左サイドバーの「証明書」メニューをクリックすると証明書一覧が表示されます。車両番号・オーナー名・発行日・有効期限でフィルターや検索が可能です。各行をクリックすると詳細が開きます。"
      subtext="一覧は最新順に表示されます。CSVエクスポートは右上の「エクスポート」ボタンから行えます。"
    />
  </AbsoluteFill>
);
