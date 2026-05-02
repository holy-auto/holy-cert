import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const AgentV2ReferralNew: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/agent/referrals-new.png"
      step="手順 2"
      title="新規紹介の登録"
      description="「新規紹介」ボタンをクリックして、紹介するお客様の基本情報（氏名・連絡先・希望内容）を入力します。送信すると専用の紹介URLが発行されるので、お客様にLINE・メール等で共有してください。"
      subtext="紹介URLにはあなたのエージェントIDが埋め込まれており、お客様が申し込むと自動的に紐付けられます。"
    />
  </AbsoluteFill>
);
