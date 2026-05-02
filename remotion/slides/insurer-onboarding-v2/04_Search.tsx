import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../components/longform";
import { ScreenshotSlide } from "../../components/screenshot-slide";

export const InsurerV2Search: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <ScreenshotSlide
      file="screenshots/insurer/search.png"
      step="手順 1"
      title="証明書の検索"
      description="「照会」メニューから車両番号（ナンバープレート）または車台番号で証明書を検索できます。部分一致検索も可能です。検索結果には最新の整備証明書と整備履歴が表示されます。"
      subtext="1日あたりの照会件数に制限はありません。照会ログはすべて記録されます。"
    />
  </AbsoluteFill>
);
