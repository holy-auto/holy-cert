import { AbsoluteFill } from "remotion";
import {
  LongFormLayout,
  Label,
  Heading,
  BulletList,
  AnimItem,
  FadeIn,
  SmallCard,
  Tip,
  Warn,
  FONT,
  TEXT,
  TEXT_MUTED,
  BLUE,
} from "../../components/longform";

const SEARCH_ITEMS = [
  "フリーワード検索（顧客名 / 車両番号 / public_id）",
  "ステータスフィルタ：有効 / 無効 / 全て",
  "日付範囲フィルタ（発行日）",
  "施工メニューで絞り込み",
  "ソート：発行日 / 顧客名 / 金額",
  "テーブル行クリックで詳細ページへ即遷移",
];

export const CertList: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
      <LongFormLayout slideNo={6} total={25}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 48,
            alignItems: "start",
          }}
        >
          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div>
              <Label>証明書管理 /admin/certificates</Label>
              <Heading size={52}>一覧・検索・フィルタの全機能</Heading>
            </div>
            <div style={{ marginTop: 4 }}>
              <BulletList items={SEARCH_ITEMS} startDelay={4} gap={12} />
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <AnimItem delay={10}>
              <SmallCard>
                <div
                  style={{
                    fontSize: 16,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase" as const,
                    color: BLUE,
                    fontFamily: "monospace",
                    marginBottom: 16,
                  }}
                >
                  ステータスバッジ
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      style={{
                        padding: "4px 16px",
                        borderRadius: 100,
                        background: "rgba(34,197,94,0.15)",
                        border: "1px solid rgba(34,197,94,0.4)",
                        color: "#22c55e",
                        fontSize: 17,
                        fontWeight: 600,
                      }}
                    >
                      有効
                    </div>
                    <span style={{ fontSize: 18, color: TEXT_MUTED }}>公開ページでアクセス可能</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      style={{
                        padding: "4px 16px",
                        borderRadius: 100,
                        background: "rgba(239,68,68,0.15)",
                        border: "1px solid rgba(239,68,68,0.4)",
                        color: "#ef4444",
                        fontSize: 17,
                        fontWeight: 600,
                      }}
                    >
                      無効
                    </div>
                    <span style={{ fontSize: 18, color: TEXT_MUTED }}>公開ページから非表示</span>
                  </div>
                </div>
              </SmallCard>
            </AnimItem>

            <FadeIn delay={24}>
              <Tip>
                一覧画面でチェックボックスを選択すると複数証明書をまとめて PDF 出力できます（バッチ PDF）
              </Tip>
            </FadeIn>

            <FadeIn delay={36}>
              <Warn>
                証明書の削除はできません。無効化で対応してください
              </Warn>
            </FadeIn>
          </div>
        </div>
      </LongFormLayout>
    </AbsoluteFill>
  );
};
