import { AbsoluteFill } from "remotion";
import { ChapterDivider, FONT } from "../../components/longform";

export const Ch4Divider: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
      <ChapterDivider
        chapter="Chapter 4"
        title="予約・案件"
        sub="予約管理・統合ワークフロー・飛び込み案件"
        color="#f59e0b"
      />
    </AbsoluteFill>
  );
};
