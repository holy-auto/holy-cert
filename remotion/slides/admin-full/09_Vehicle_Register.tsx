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
  BLUE,
} from "../../components/longform";

const METHODS = [
  {
    icon: "✋",
    title: "手動入力",
    path: "/admin/vehicles/new",
    items: [
      "車両番号・型式・車台番号",
      "年式・色・メーカー",
      "サイズ（全長/全幅/全高）",
      "NFC タグ同時登録可能",
    ],
    color: BLUE,
  },
  {
    icon: "📷",
    title: "車検証 OCR",
    path: "",
    items: [
      "カメラで撮影するだけ",
      "型式/車台番号/サイズを自動抽出",
      "読取精度が低い場合は手動補正",
      "iOS/Android 対応",
    ],
    color: "#06b6d4",
  },
  {
    icon: "📊",
    title: "CSV 一括インポート",
    path: "",
    items: [
      "ヘッダー行でカラムをマッピング",
      "数百台を一度に登録",
      "エラー行はスキップしてレポート表示",
    ],
    color: "#10b981",
  },
];

export const VehicleRegister: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
      <LongFormLayout slideNo={10} total={25}>
        <div>
          <Label>車両管理 /admin/vehicles</Label>
          <Heading size={52}>車両登録の全手順</Heading>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 20,
            marginTop: 32,
          }}
        >
          {METHODS.map((method, i) => (
            <AnimItem key={i} delay={i * 12}>
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${method.color}28`,
                  borderRadius: 16,
                  padding: "22px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  boxSizing: "border-box",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 26 }}>{method.icon}</span>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 600, color: TEXT }}>
                      {method.title}
                    </div>
                    {method.path && (
                      <div
                        style={{
                          fontSize: 13,
                          fontFamily: "monospace",
                          color: method.color,
                          marginTop: 2,
                          opacity: 0.8,
                        }}
                      >
                        {method.path}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {method.items.map((item, j) => (
                    <div
                      key={j}
                      style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: method.color,
                          opacity: 0.7,
                          flexShrink: 0,
                          marginTop: 8,
                        }}
                      />
                      <span style={{ fontSize: 17, color: TEXT_MUTED, lineHeight: 1.5 }}>
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </AnimItem>
          ))}
        </div>

        <FadeIn delay={44}>
          <div style={{ marginTop: 24 }}>
            <Tip>
              車両詳細ページ（/admin/vehicles/[id]）では、その車両に関連する全証明書・全予約・全NFC タグを統合タイムラインで一覧できます
            </Tip>
          </div>
        </FadeIn>
      </LongFormLayout>
    </AbsoluteFill>
  );
};
