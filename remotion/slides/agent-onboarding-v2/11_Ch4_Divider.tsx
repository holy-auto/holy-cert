import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT, ChapterDivider } from "../../components/longform";

export const AgentV2Ch4Divider: React.FC = () => (
  <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
    <ChapterDivider chapter="Chapter 4" title="トレーニング・素材" sub="スキルアップと紹介活動のサポート" />
  </AbsoluteFill>
);
