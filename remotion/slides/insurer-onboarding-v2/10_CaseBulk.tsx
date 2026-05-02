import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const InsurerV2CaseBulk: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/insurer/cases.png"
      step="手順 3"
      title="事案の一括処理"
      description="チェックボックスで複数の事案を選択すると、一括でステータス変更・担当者変更・エクスポートが行えます。同種の事案が多い場合に業務効率を大幅に向上させます。"
      subtext="フィルターで絞り込んだ後に「すべて選択」を使うと効率的です。"
    />
  </AbsoluteFill>
);
