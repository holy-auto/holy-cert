import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const AdminV2Login: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/admin/login.png"
      step="手順 1"
      title="管理者ポータルへのログイン"
      description="ブラウザで管理者ポータルのURLを開きます。メールアドレスと初期パスワードを入力し「ログイン」をクリックしてください。パスワードは管理者から受け取ります。"
      subtext="URLは https://[yourshop].ledra.jp/login です（テナントURLは管理者から通知されます）。"
    />
  </AbsoluteFill>
);
