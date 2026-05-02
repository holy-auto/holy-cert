import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const InsurerV2Users: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/insurer/dashboard.png"
      step="確認 1"
      title="ユーザー管理"
      description="「設定」→「ユーザー」タブでは担当者アカウントの追加・編集・削除ができます。メールアドレスを入力して招待を送信するとアカウントが作成されます。「管理者」「担当者」「閲覧者」のロールが選択できます。"
      subtext="SSO（シングルサインオン）での連携も可能です。設定はLedraサポートにお問い合わせください。"
    />
  </AbsoluteFill>
);
