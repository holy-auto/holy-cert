import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT, ChapterDivider } from "../../components/longform";

export const AgentV2Ch2Divider: React.FC = () => (
  <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
    <ChapterDivider chapter="Chapter 2" title="紹介リンク管理" sub="紹介URLの発行・共有・追跡" />
  </AbsoluteFill>
);
