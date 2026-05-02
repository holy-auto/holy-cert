import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT, ChapterDivider } from "../../components/longform";

export const InsurerV2Ch1Divider: React.FC = () => (
  <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
    <ChapterDivider
      chapter="Chapter 1"
      title="ログイン＆ダッシュボード"
      sub="保険会社ポータルへのアクセス方法"
    />
  </AbsoluteFill>
);
