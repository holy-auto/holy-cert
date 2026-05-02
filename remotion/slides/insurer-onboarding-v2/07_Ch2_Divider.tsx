import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT, ChapterDivider } from "../../components/longform";

export const InsurerV2Ch2Divider: React.FC = () => (
  <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
    <ChapterDivider
      chapter="Chapter 2"
      title="事案管理"
      sub="保険事案の登録・追跡・一括処理"
    />
  </AbsoluteFill>
);
