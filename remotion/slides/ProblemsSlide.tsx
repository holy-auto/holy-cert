import { AbsoluteFill } from "remotion";
import { SlideLayout, Label, Heading, AnimItem, TEXT, TEXT_MUTED } from "../components/shared";

const PROBLEMS = [
  "紙の証明書は紛失・劣化しやすく、管理が煩雑",
  "第三者が証明書の真正性をリアルタイムで確認できない",
  "予約・作業・証明書・請求がバラバラで何度も転記が必要",
  "保険会社への施工実績提出に時間がかかりすぎる",
  "施工店間での連携・受発注の手段がない",
];

export const ProblemsSlide: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12" }}>
      <SlideLayout>
        <Label>業界の課題</Label>
        <Heading>
          自動車施工業界が
          <br />
          <span style={{ color: "#ef4444" }}>抱える 5 つの問題</span>
        </Heading>

        <div style={{ marginTop: 56, display: "flex", flexDirection: "column", gap: 24 }}>
          {PROBLEMS.map((text, i) => (
            <AnimItem key={i} delay={i * 12}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "rgba(239,68,68,0.15)",
                    border: "1px solid rgba(239,68,68,0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  <span style={{ color: "#f87171", fontSize: 18, fontWeight: 700 }}>✕</span>
                </div>
                <span style={{ fontSize: 32, color: TEXT_MUTED, lineHeight: 1.4 }}>{text}</span>
              </div>
            </AnimItem>
          ))}
        </div>
      </SlideLayout>
    </AbsoluteFill>
  );
};
