import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT, ChapterDivider } from "../../components/longform";

export const AgentV2Ch3Divider: React.FC = () => (
  <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
    <ChapterDivider chapter="Chapter 3" title="報酬・レポート" sub="収益の確認と実績の把握" />
  </AbsoluteFill>
);
