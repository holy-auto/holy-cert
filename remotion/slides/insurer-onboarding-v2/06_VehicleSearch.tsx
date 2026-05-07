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
      description="「車両」メニューでは登録済みの車両一覧と、各車両に紐づく整備証明書・事案を時系列で追跡できます。プレート・車台番号での絞り込みも可能です。"
      subtext="特に要注意な車両は別途「ウォッチリスト」メニューで個別に追跡できます。"
    />
  </AbsoluteFill>
);
