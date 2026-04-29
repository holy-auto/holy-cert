import { AbsoluteFill } from "remotion";
import { ChapterDivider, FONT } from "../../components/longform";

export const Ch3Divider: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
      <ChapterDivider
        chapter="Chapter 3"
        title="車両・顧客管理"
        sub="OCR登録・タイムライン・360°ビュー"
        color="#10b981"
      />
    </AbsoluteFill>
  );
};
