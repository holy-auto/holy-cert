/**
 * 透明性ダッシュボード (/transparency) の編集データ。
 *
 * 設計意図:
 *   Buffer 型の公開ダッシュボード。「透明性を売る会社が、不透明であってはならない」。
 *   証明書発行数・導入施工店数は本番 DB から直接集計する (getMarketingStats)。
 *   一方、解約率・月次の正直な記録・推移グラフ・ロードマップは事業判断を伴う
 *   編集コンテンツのため、ここに 1 ファイルに集約する。
 *
 *   ── 約束 (PLEDGES[0]): この内容は毎月 1 日に更新する。
 *      良い月も悪い月も、同じ場所に、同じ粒度で載せる。更新時はこのファイルだけを編集する。
 *
 * 注意:
 *   churn・chart の数値は現時点ではサンプル (プロトタイプ由来のダミー)。
 *   実運用では実績値へ差し替える。サンプルである旨はページ上で明示する
 *   (isSample フラグ / ヒーローのスタンプ)。
 */

/** スナップショット対象月 (毎月 1 日に更新) */
export const SNAPSHOT_MONTH = "2026年5月";

/** churn・chart などが実績値か、まだサンプル(ダミー)かを示す */
export const TRANSPARENCY_FIGURES_ARE_SAMPLE = true;

export type ChurnMetric = {
  /** 月次解約率 (%) */
  rate: number;
  /** 社内目標 (%) */
  target: number;
  /** 率直なコメント — 不都合でも隠さない */
  note: string;
};

/**
 * 月次解約率。Ledra にとって最重要かつ最も不都合な数字。
 * 目標未達でも、良い数字と同じ場所に同じ大きさで載せる。
 */
export const CHURN: ChurnMetric = {
  rate: 4.8,
  target: 3.0,
  note: "正直に言うと、まだ高い。改善中の最重要課題です。解約面談の内容は下の「正直な記録」に記載しています。",
};

export type ChartPoint = {
  /** 表示ラベル (例: "5月") */
  label: string;
  /** その月の発行数 */
  value: number;
};

/** 直近 6 ヶ月の月間証明書発行数。誇張のない実数推移 (現時点はサンプル)。 */
export const ISSUANCE_HISTORY: ChartPoint[] = [
  { label: "12月", value: 312 },
  { label: "1月", value: 388 },
  { label: "2月", value: 351 },
  { label: "3月", value: 503 },
  { label: "4月", value: 587 },
  { label: "5月", value: 694 },
];

export type LedgerKind = "win" | "miss" | "learn";

export type LedgerEntry = {
  kind: LedgerKind;
  title: string;
  body: string;
};

/**
 * 今月の正直な記録。「うまくいった / しくじった / 学んだ」を必ず 3 つとも載せる。
 * miss を省略した月は作らない ── それが透明性の核心。
 */
export const HONEST_LEDGER: LedgerEntry[] = [
  {
    kind: "win",
    title: "コーティングメーカー1社とパイロット契約を締結",
    body: "初のメーカー連携。認定施工店3店でのパイロットが始動しました。",
  },
  {
    kind: "miss",
    title: "証明書発行ツールで2時間の障害が発生",
    body: "5月14日、施工店が証明書を発行できない時間帯がありました。原因と対策はサポートページに全文掲載しています。ご迷惑をおかけしました。",
  },
  {
    kind: "learn",
    title: "解約理由の多くは「使い方が分からない」だった",
    body: "解約面談から、機能不足より「オンボーディング不足」が主因と判明。来月、初期トレーニングを刷新します。",
  },
];

export type RoadmapStage = "in-progress" | "next" | "later";

export type RoadmapColumn = {
  stage: RoadmapStage;
  heading: string;
  /** モノスペースのステータスラベル */
  badge: string;
  items: string[];
};

/** 公開ロードマップ。何を作っているかだけでなく、何を後回しにしているかも隠さない。 */
export const ROADMAP: RoadmapColumn[] = [
  {
    stage: "in-progress",
    heading: "進行中",
    badge: "IN PROGRESS",
    items: ["オンボーディング刷新", "損保向け証明書照会ツール", "メーカー向け管理画面"],
  },
  {
    stage: "next",
    heading: "次にやる",
    badge: "NEXT",
    items: ["メンテ履歴の追記機能", "中古車プラットフォーム連携API"],
  },
  {
    stage: "later",
    heading: "後回し中",
    badge: "LATER",
    items: ["多言語対応", "スマホアプリ"],
  },
];

/** 透明性の約束。事業継続に関わる重い約束まで含めて明文化する。 */
export const PLEDGES: string[] = [
  "事業の主要な数字を、毎月1日に更新して公開します。良い月も悪い月も。",
  "サービス障害が起きたら、原因と対策を全文公開します。隠しません。",
  "ロードマップを公開し、何を後回しにしているかも明示します。",
  "もしLedraが事業を続けられなくなったら、6ヶ月前に告知し、データを完全にお渡しします。",
];
