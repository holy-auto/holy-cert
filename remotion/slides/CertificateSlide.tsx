import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { SlideLayout, Label, Heading, Card, TEXT, TEXT_MUTED, BLUE } from "../components/shared";

const STEPS = [
  { no: "01", title: "車両登録", desc: "車検証 OCR で自動読取" },
  { no: "02", title: "施工・写真", desc: "施工内容と写真をアップロード" },
  { no: "03", title: "証明書発行", desc: "QR コードを自動生成" },
  { no: "04", title: "顧客共有", desc: "スマホで即閲覧・PDF 出力" },
  { no: "05", title: "BC 記録", desc: "Polygon で改ざん防止" },
];

function Step({ step, index }: { step: (typeof STEPS)[0]; index: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = Math.max(0, frame - index * 14);
  const opacity = spring({ frame: start, fps, config: { damping: 18 }, durationInFrames: 20 });

  return (
    <div style={{ opacity, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, flex: 1, textAlign: "center" }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "rgba(59,130,246,0.15)",
          border: `1.5px solid ${BLUE}80`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          fontFamily: "monospace",
          color: BLUE,
        }}
      >
        {step.no}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: TEXT }}>{step.title}</div>
      <div style={{ fontSize: 18, color: TEXT_MUTED, lineHeight: 1.4 }}>{step.desc}</div>
    </div>
  );
}

function Arrow({ index }: { index: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = Math.max(0, frame - index * 14 - 7);
  const opacity = spring({ frame: start, fps, config: { damping: 18 }, durationInFrames: 16 });

  return (
    <div style={{ opacity, color: "rgba(255,255,255,0.2)", fontSize: 32, alignSelf: "flex-start", paddingTop: 20 }}>→</div>
  );
}

export const CertificateSlide: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12" }}>
      <SlideLayout>
        <Label>主要機能 1</Label>
        <Heading size={60}>
          施工証明書の発行
          <br />
          <span style={{ color: BLUE }}>たった数ステップで完了</span>
        </Heading>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 52 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1 }}>
              <Step step={s} index={i} />
              {i < STEPS.length - 1 && <Arrow index={i} />}
            </div>
          ))}
        </div>

        <Card style={{ marginTop: 48 }}>
          <p style={{ fontSize: 24, color: TEXT_MUTED, margin: 0, lineHeight: 1.6 }}>
            証明書には施工内容・写真・施工店情報が記録され、公開 URL から誰でも真正性を検証できます。
            ブロックチェーンに写真ハッシュをアンカリングすることで、デジタル改ざんを完全に防止します。
          </p>
        </Card>
      </SlideLayout>
    </AbsoluteFill>
  );
};
