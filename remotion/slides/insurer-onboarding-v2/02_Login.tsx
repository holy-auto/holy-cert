import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const InsurerV2Login: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/insurer/login.png"
      step="手順 1"
      title="保険会社ポータルへのログイン"
      description="ブラウザで保険会社専用ポータルのURLを開きます。管理者から付与されたメールアドレスとパスワードを入力して「ログイン」をクリックしてください。"
      subtext="URL: https://[yourcompany].ledra.jp/insurer/login（URLは Ledra サポートから通知されます）"
    />
  </AbsoluteFill>
);
