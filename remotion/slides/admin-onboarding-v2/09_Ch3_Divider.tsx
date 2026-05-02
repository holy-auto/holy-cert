import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT, ChapterDivider } from "../../components/longform";

export const AdminV2Ch3Divider: React.FC = () => (
  <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
    <ChapterDivider chapter="Chapter 3" title="車両・顧客管理" sub="車両台帳とお客様情報の一元管理" />
  </AbsoluteFill>
);
