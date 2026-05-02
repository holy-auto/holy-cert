import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const AdminV2Members: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/admin/settings-members.png"
      step="手順 2"
      title="メンバーとロール管理"
      description="「メンバー管理」タブでスタッフアカウントを追加できます。メールアドレスを入力して招待を送ると、スタッフが初回ログイン時にパスワードを設定します。ロールは「管理者」「スタッフ」「閲覧のみ」から選べます。"
      subtext="退職したスタッフのアカウントは「無効化」することで即座にアクセスを停止できます。"
    />
  </AbsoluteFill>
);
