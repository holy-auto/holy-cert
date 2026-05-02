import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT, ChapterDivider } from "../../components/longform";

export const AdminV2Ch5Divider: React.FC = () => (
  <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
    <ChapterDivider chapter="Chapter 5" title="決済・請求" sub="POSとオンライン決済の連携" />
  </AbsoluteFill>
);
