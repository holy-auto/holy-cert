import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const InsurerV2CaseCreate: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/insurer/cases-new.png"
      step="手順 2"
      title="新規事案の登録"
      description="「新規事案」ボタンをクリックして事案を作成します。車両番号を入力すると関連する証明書が自動的にリンクされます。事案種別・優先度・担当者・期限を設定して「作成」をクリックしてください。"
      subtext="事案作成時に、関連する証明書・整備記録が自動的に添付されます。"
    />
  </AbsoluteFill>
);
