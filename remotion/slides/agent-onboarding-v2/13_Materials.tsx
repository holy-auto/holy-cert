import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const AgentV2Materials: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/agent/materials.png"
      step="確認 2"
      title="営業資料のダウンロード"
      description="「営業資料」では本部から共有されたパンフレット・契約書・マニュアル等をダウンロードできます。資料名・ファイル名で検索でき、PDF をブラウザで直接プレビューしてからダウンロードできます。"
      subtext="施工店向けの操作ガイドも同じページから取得可能です。"
    />
  </AbsoluteFill>
);
