import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const AdminV2VehicleNew: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/admin/vehicles-new.png"
      step="手順 2"
      title="新規車両の登録"
      description="「車両登録」ボタンをクリックして車両情報を入力します。車両番号・車種・年式・オーナー情報を入力してください。車検証をOCRで読み取る「スキャン登録」も利用できます。"
      subtext="車両登録後は自動的に整備履歴タイムラインが作成されます。"
    />
  </AbsoluteFill>
);
