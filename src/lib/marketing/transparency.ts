/**
 * 透明性ダッシュボード (/financial-transparency) の単一の真実源 (single source of truth)。
 *
 * 設計意図:
 *   「透明性を売る会社が、不透明であってはならない」。
 *   - 証明書発行数・導入施工店数・推移グラフは本番 DB から実集計 (getMarketingStats)。
 *   - 月次解約率は会社全体の解約を計測する仕組みが未整備のため、数値は出さず
 *     「計測体制構築中」と正直に表示する (CHURN.measuring)。
 *   - 「今月の正直な記録」「公開ロードマップ」は事業判断を伴う編集コンテンツ。
 *     ここに *実際の* 記録だけを入れる。
 *
 * 運用ルール (重要 ── これがそのまま透明性の担保):
 *   1. ねつ造した見栄えの良いサンプルを置かない。実績のみ。
 *   2. まだ無いものは空配列のままにする → ページは「まだありません」と
 *      正直な空状態を表示する (取り繕わない)。
 *   3. 毎月 1 日に、このファイルだけを編集して更新する (PLEDGES[0] の実体)。
 *   4. 「しくじった」を省いた月は作らない。3 種 (win/miss/learn) を揃える。
 */

/** スナップショット対象月 (毎月 1 日に更新)。記録がある月のみ表示に使う。 */
export const SNAPSHOT_MONTH = "2026年5月";

export type ChurnStatus = {
  /** 実測値をまだ出せない (会社全体の解約計測が未整備) か */
  measuring: boolean;
  /** 率直なコメント */
  note: string;
};

/**
 * 月次解約率。会社全体の解約を継続計測する基盤が未整備のため、
 * 取り繕ったサンプル値は出さず「計測体制構築中」であることを明示する。
 */
export const CHURN: ChurnStatus = {
  measuring: true,
  note: "解約を継続計測する基盤を整備中です。整い次第、月次解約率を ── 良い月も悪い月も ── ここに同じ大きさで載せます。それまで取り繕った数値は出しません。",
};

export type LedgerKind = "win" | "miss" | "learn";

export type LedgerEntry = {
  kind: LedgerKind;
  title: string;
  body: string;
};

/**
 * 今月の正直な記録。「うまくいった / しくじった / 学んだ」を必ず 3 つとも載せる。
 *
 * ここには *実際に起きたこと* だけを書く。まだ公開できる記録が無い月は
 * 空のままにする ── ページは「まだ公開していません」と正直に表示する。
 * ねつ造したサンプルを置くことは、このページの存在意義に反する。
 */
export const HONEST_LEDGER: LedgerEntry[] = [];

export type RoadmapStage = "in-progress" | "next" | "later";

export type RoadmapColumn = {
  stage: RoadmapStage;
  heading: string;
  /** モノスペースのステータスラベル */
  badge: string;
  items: string[];
};

/**
 * 公開ロードマップ。何を作っているかだけでなく、何を後回しにしているかも隠さない。
 *
 * 確定した計画だけを記載する。未確定のうちは空のままにし、ページ側で
 * 「整備中」と正直に表示する。憶測で埋めない。
 */
export const ROADMAP: RoadmapColumn[] = [];

/** 透明性の約束。事業継続に関わる重い約束まで含めて明文化する。 */
export const PLEDGES: string[] = [
  "事業の主要な数字を、毎月1日に更新して公開します。良い月も悪い月も。",
  "サービス障害が起きたら、原因と対策を全文公開します。隠しません。",
  "ロードマップを公開し、何を後回しにしているかも明示します。",
  "もしLedraが事業を続けられなくなったら、6ヶ月前に告知し、データを完全にお渡しします。",
];
