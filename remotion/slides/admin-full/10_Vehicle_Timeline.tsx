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
  FONT,
  TEXT,
  TEXT_MUTED,
  BLUE,
} from "../../components/longform";

const TIMELINE_ITEMS = [
  "vehicle_histories + certificates + reservations + nfc_tags を1本の時系列に合成",
  "証明書発行・削除イベントを青バッジで表示",
  "来店・作業開始・完了イベントを黄バッジで表示",
  "NFC 書込イベントを紫バッジで表示",
  "各イベントをクリックすると詳細ページへ即遷移",
];

const INSURANCE_ITEMS = [
  "「この車両に他の施工はあるか」に1画面で即答",
  "「いつ何をされたか」の時系列が一目瞭然",
  "施工店・施工日・施工内容を証明書リンクと一緒に提示",
];

export const VehicleTimeline: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
      <LongFormLayout slideNo={11} total={25}>
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
              <Label>車両管理 /admin/vehicles/[id]</Label>
              <Heading size={50}>統合サービス履歴タイムライン</Heading>
            </div>
            <div style={{ marginTop: 4 }}>
              <BulletList items={TIMELINE_ITEMS} startDelay={4} gap={12} />
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <AnimItem delay={12}>
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
                  保険査定での活用
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {INSURANCE_ITEMS.map((item, i) => (
                    <div
                      key={i}
                      style={{ display: "flex", gap: 12, alignItems: "flex-start" }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: BLUE,
                          opacity: 0.7,
                          flexShrink: 0,
                          marginTop: 8,
                        }}
                      />
                      <span style={{ fontSize: 18, color: TEXT_MUTED, lineHeight: 1.55 }}>
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </SmallCard>
            </AnimItem>

            <FadeIn delay={28}>
              <Tip>
                旧スキーマ（label/note/created_at）と新スキーマ（title/description/performed_at）の両方に対応しているため、過去データもすべて表示されます
              </Tip>
            </FadeIn>
          </div>
        </div>
      </LongFormLayout>
    </AbsoluteFill>
  );
};
