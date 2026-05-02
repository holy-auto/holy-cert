import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const AgentV2Login: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/agent/login.png"
      step="手順 1"
      title="エージェントポータルへのログイン"
      description="ブラウザでエージェント専用ポータルのURLを開きます。招待メールに記載されたメールアドレスと、初回設定したパスワードを入力してログインしてください。"
      subtext="URL: https://ledra.jp/agent/login — 招待はメールで届きます。リンクの有効期限は72時間です。"
    />
  </AbsoluteFill>
);
