import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT, ChapterDivider } from "../../components/longform";

export const AdminV2Ch2Divider: React.FC = () => (
  <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
    <ChapterDivider chapter="Chapter 2" title="証明書管理" sub="証明書の発行・確認・印刷まで" />
  </AbsoluteFill>
);
