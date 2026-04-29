import { AbsoluteFill } from "remotion";
import {
  LongFormLayout,
  Label,
  Heading,
  AnimItem,
  FadeIn,
  Tip,
  FONT,
  TEXT,
  TEXT_MUTED,
  TEXT_DIM,
  BLUE,
} from "../../components/longform";

const STEPS = [
  {
    num: "01",
    title: "車両を選択 or 新規登録",
    detail: "既存車両を検索 or「新規車両」タブで登録。車検証 OCR で自動入力可能",
  },
  {
    num: "02",
    title: "顧客を紐付け",
    detail: "検索 or 新規。車両から自動推測される場合あり",
  },
  {
    num: "03",
    title: "施工内容を入力",
    detail: "品目マスタから選択（複数可）。単価・数量・税区分を指定",
  },
  {
    num: "04",
    title: "写真をアップロード",
    detail: "ビフォーアフター写真。EXIF・C2PA 自動記録",
  },
  {
    num: "05",
    title: "発行",
    detail: "「発行する」ボタン → QR コード生成 → /admin/certificates/new/success へ",
  },
];

export const CertIssue: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
      <LongFormLayout slideNo={7} total={25}>
        <Label>証明書管理 /admin/certificates/new</Label>
        <Heading size={48}>新規発行フロー — 完全手順</Heading>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            marginTop: 32,
          }}
        >
          {STEPS.map((step, i) => (
            <AnimItem key={i} delay={i * 10}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 20,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 14,
                  padding: "16px 22px",
                }}
              >
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    fontFamily: "monospace",
                    color: BLUE,
                    minWidth: 32,
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  {step.num}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: TEXT }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: 18, color: TEXT_MUTED, lineHeight: 1.5 }}>
                    {step.detail}
                  </div>
                </div>
              </div>
            </AnimItem>
          ))}
        </div>

        <FadeIn delay={60}>
          <div style={{ marginTop: 24 }}>
            <Tip>
              施工テンプレートを登録しておくと、よく使う施工内容の組み合わせをワンクリックで適用できます（/admin/menu-items）
            </Tip>
          </div>
        </FadeIn>
      </LongFormLayout>
    </AbsoluteFill>
  );
};
