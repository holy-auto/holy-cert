import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const AdminV2Login: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/admin/login.png"
      step="手順 1"
      title="加盟店ポータルへのログイン"
      description="ブラウザで加盟店ポータルのURLを開きます。メールアドレスと初期パスワードを入力し「ログイン」をクリックしてください。ログイン情報はLedraサポートから送付されます。"
      subtext="URL: https://[yourshop].ledra.jp/login（テナントURLはLedraの担当者から通知されます）。"
    />
  </AbsoluteFill>
);
