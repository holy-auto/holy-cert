import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const AdminV2VehicleList: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/admin/vehicles-list.png"
      step="確認 1"
      title="車両一覧"
      description="「車両」メニューでは登録済み車両の一覧が確認できます。車両番号・オーナー・最終整備日・次回車検日などが表示されます。検索バーで素早く目的の車両を見つけられます。"
      subtext="車両ごとの整備・証明書の履歴は車両詳細ページで確認できます。"
    />
  </AbsoluteFill>
);
