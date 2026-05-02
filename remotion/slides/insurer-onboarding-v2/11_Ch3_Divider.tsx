import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT, ChapterDivider } from "../../components/longform";

export const InsurerV2Ch3Divider: React.FC = () => (
  <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
    <ChapterDivider
      chapter="Chapter 3"
      title="分析・レポート"
      sub="データを活用した業務改善"
    />
  </AbsoluteFill>
);
