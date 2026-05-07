import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const InsurerV2Users: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/insurer/users.png"
      step="確認 1"
      title="ユーザー管理"
      description="「ユーザー」では担当者アカウントの招待・ロール変更・有効化/無効化ができます。メールアドレスを入力して招待を送るとサインアップ案内が届きます。ロールは「管理者」「閲覧者」「監査者」から選択でき、管理者のみがこのページを操作できます。"
      subtext="ロール変更や無効化は即時反映されます。"
    />
  </AbsoluteFill>
);
