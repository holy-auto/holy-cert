import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT, ChapterDivider } from "../../components/longform";

export const AgentV2Ch1Divider: React.FC = () => (
  <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
    <ChapterDivider chapter="Chapter 1" title="アカウント設定" sub="エージェントとして活動を始めるための初期設定" />
  </AbsoluteFill>
);
