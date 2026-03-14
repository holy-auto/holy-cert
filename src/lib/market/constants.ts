// ──────────────────────────────────────────
// サービスカテゴリ
// ──────────────────────────────────────────
export const SERVICE_CATEGORIES = [
  { value: "window_film",      label: "ウィンドウフィルム" },
  { value: "body_glass_coat",  label: "ボディガラスコーティング" },
  { value: "ppf",              label: "ペイントプロテクションフィルム" },
  { value: "wrap",             label: "カーラッピング" },
  { value: "other",            label: "その他" },
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number]["value"];

export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  SERVICE_CATEGORIES.map(({ value, label }) => [value, label])
);

// ──────────────────────────────────────────
// 価格単位
// ──────────────────────────────────────────
export const PRICE_UNITS = [
  { value: "per_vehicle", label: "台あたり" },
  { value: "per_sqm",     label: "㎡あたり" },
] as const;

export const UNIT_LABEL: Record<string, string> = Object.fromEntries(
  PRICE_UNITS.map(({ value, label }) => [value, label])
);

// ──────────────────────────────────────────
// 都道府県
// ──────────────────────────────────────────
export const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
  "岐阜県", "静岡県", "愛知県", "三重県",
  "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
  "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県",
  "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
] as const;

export type Prefecture = (typeof PREFECTURES)[number];

export const REGIONS: { name: string; prefectures: readonly string[] }[] = [
  { name: "北海道・東北", prefectures: ["北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県"] },
  { name: "関東",         prefectures: ["茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県"] },
  { name: "中部",         prefectures: ["新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県","静岡県","愛知県","三重県"] },
  { name: "近畿",         prefectures: ["滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県"] },
  { name: "中国・四国",   prefectures: ["鳥取県","島根県","岡山県","広島県","山口県","徳島県","香川県","愛媛県","高知県"] },
  { name: "九州・沖縄",   prefectures: ["福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県"] },
];

// ──────────────────────────────────────────
// ニュースカテゴリ
// ──────────────────────────────────────────
export const NEWS_CATEGORIES = [
  { value: "general",    label: "一般" },
  { value: "product",    label: "製品情報" },
  { value: "regulation", label: "法規制" },
  { value: "market",     label: "市場動向" },
  { value: "event",      label: "イベント" },
] as const;

export const NEWS_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  NEWS_CATEGORIES.map(({ value, label }) => [value, label])
);

// ──────────────────────────────────────────
// ユーティリティ
// ──────────────────────────────────────────
export function fmtPrice(v?: number | null) {
  if (v == null) return "—";
  return `¥${v.toLocaleString("ja-JP")}`;
}

export function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString("ja-JP");
}
