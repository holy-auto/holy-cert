import { AbsoluteFill } from "remotion";
import { SlideLayout, Label, Heading, AnimItem, TEXT_MUTED } from "../components/shared";

const SOLUTIONS = [
  "QR コード付きデジタル証明書で永続的に管理・共有",
  "ブロックチェーンアンカリングで改ざん不可の真正性保証",
  "予約 → 作業 → 証明書 → 請求を 1 画面で完結",
  "保険会社専用ポータルで証明書を即座に検索・照会",
  "BtoB マーケットプレイスで施工店間の受発注を実現",
];

export const SolutionSlide: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12" }}>
      <SlideLayout>
        <Label>Ledra の解決策</Label>
        <Heading>
          すべての課題を
          <br />
          <span style={{ color: "#22c55e" }}>Ledra が解決します</span>
        </Heading>

        <div style={{ marginTop: 56, display: "flex", flexDirection: "column", gap: 24 }}>
          {SOLUTIONS.map((text, i) => (
            <AnimItem key={i} delay={i * 12}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "rgba(34,197,94,0.15)",
                    border: "1px solid rgba(34,197,94,0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  <span style={{ color: "#86efac", fontSize: 18, fontWeight: 700 }}>✓</span>
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
