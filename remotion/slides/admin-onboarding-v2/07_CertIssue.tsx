import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const AdminV2CertIssue: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/admin/certs-new.png"
      step="手順 2"
      title="新規証明書の発行"
      description="「新規発行」ボタンをクリックすると発行フォームが開きます。車両番号を入力すると車両情報が自動入力されます。作業内容・部品番号・写真を追加して「発行」をクリックしてください。"
      subtext="OCRで車検証から情報を自動読み取りする機能も利用できます。発行後はQRコードが自動生成されます。"
    />
  </AbsoluteFill>
);
