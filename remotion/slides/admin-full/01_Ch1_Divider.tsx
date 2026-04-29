import { AbsoluteFill } from "remotion";
import { ChapterDivider, FONT } from "../../components/longform";

export const Ch1Divider: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
      <ChapterDivider
        chapter="Chapter 1"
        title="ダッシュボード"
        sub="KPI・ウィジェット・クイックアクションの全解説"
        color="#3b82f6"
      />
    </AbsoluteFill>
  );
};
