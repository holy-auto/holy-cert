import { AbsoluteFill } from "remotion";
import {
  LongFormLayout,
  Label,
  Heading,
  AnimItem,
  FadeIn,
  Warn,
  FONT,
  TEXT,
  TEXT_MUTED,
  BLUE,
} from "../../components/longform";

const OPS = [
  {
    icon: "📄",
    title: "PDF 出力",
    detail: "ブラウザから直接 PDF 生成。@react-pdf/renderer で高品質レンダリング。ロゴ・テンプレート反映",
    color: BLUE,
  },
  {
    icon: "🚫",
    title: "無効化",
    detail: "ステータスを「無効」に変更。公開ページに即反映。理由の入力（任意）",
    color: "#ef4444",
  },
  {
    icon: "♻️",
    title: "複製",
    detail: "同一車両・顧客の再施工に便利。施工内容・写真はコピーされ再編集可能",
    color: "#10b981",
  },
  {
    icon: "⛓️",
    title: "BC アンカリング",
    detail: "Polygon への記録状況を確認。Tx Hash でブロックチェーンエクスプローラーへ遷移可能",
    color: "#8b5cf6",
  },
];

export const CertOps: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
      <LongFormLayout slideNo={8} total={25}>
        <Label>証明書管理 /admin/certificates/[public_id]</Label>
        <Heading size={50}>証明書の操作一覧</Heading>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
            marginTop: 32,
          }}
        >
          {OPS.map((op, i) => (
            <AnimItem key={i} delay={i * 10}>
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${op.color}28`,
                  borderRadius: 16,
                  padding: "22px 26px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  height: "100%",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 28 }}>{op.icon}</span>
                  <span style={{ fontSize: 22, fontWeight: 600, color: TEXT }}>
                    {op.title}
                  </span>
                </div>
                <div style={{ fontSize: 18, color: TEXT_MUTED, lineHeight: 1.55 }}>
                  {op.detail}
                </div>
              </div>
            </AnimItem>
          ))}
        </div>

        <FadeIn delay={50}>
          <div style={{ marginTop: 24 }}>
            <Warn>
              無効化した証明書を再び有効化することも可能ですが、保険会社ポータルでの照会履歴はリセットされません
            </Warn>
          </div>
        </FadeIn>
      </LongFormLayout>
    </AbsoluteFill>
  );
};
