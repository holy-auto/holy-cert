import { AbsoluteFill } from "remotion";
import { ChapterDivider, FONT } from "../../components/longform";

export const Ch2Divider: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
      <ChapterDivider
        chapter="Chapter 2"
        title="証明書管理"
        sub="発行・検索・PDF・バッチ・無効化・複製"
        color="#06b6d4"
      />
    </AbsoluteFill>
  );
};
