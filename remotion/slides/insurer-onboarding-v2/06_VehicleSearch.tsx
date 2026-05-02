import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const InsurerV2VehicleSearch: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/insurer/vehicles.png"
      step="手順 3"
      title="車両履歴の確認"
      description="「車両」メニューでは特定の車両の整備履歴全件が確認できます。事故歴・重大な整備記録などを時系列で追うことができます。「ウォッチリストに追加」ボタンで要注意車両を監視リストに登録できます。"
      subtext="車両情報は車検証QRコードのスキャンでも検索できます。"
    />
  </AbsoluteFill>
);
