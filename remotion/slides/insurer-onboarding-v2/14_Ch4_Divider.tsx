import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT, ChapterDivider } from "../../components/longform";

export const InsurerV2Ch4Divider: React.FC = () => (
  <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
    <ChapterDivider
      chapter="Chapter 4"
      title="設定・管理"
      sub="チームと通知の管理"
    />
  </AbsoluteFill>
);
