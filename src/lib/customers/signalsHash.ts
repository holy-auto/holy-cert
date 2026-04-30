/**
 * 顧客 signals の安定ハッシュ。
 *
 * AI サマリのキャッシュキー兼変化検知に使う。signals が論理的に同じなら必ず
 * 同じハッシュを返す (=> オブジェクトのキー順や、無関係な揺らぎに左右されない)。
 *
 * 入力の中で「サマリの内容に影響しない」ものは含めない (例: ID 文字列の中身、
 * 日付の細かい部分)。これによりキャッシュヒット率が高まる。
 */
import type { CustomerSignals } from "./signals";

/**
 * SHA-256 → hex の薄いラッパー。Web Crypto を使うので Node / Edge / ブラウザ
 * のどこでも動く。決定論的でテストしやすい。
 */
async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * signals → ハッシュ。サマリ生成に効く粒度だけ含める。
 *
 * 含める: vehicleCount / activeCertificateCount / 日数バケット / 未払合計 /
 *        nextActions の id 配列。
 * 含めない: 個々の reservation/invoice の id (= 同じ件数なら同じサマリで OK)。
 */
export async function computeSignalsHash(signals: CustomerSignals): Promise<string> {
  const payload = {
    v: 1, // バージョン (prompt を変えたら bump して全件再生成)
    vc: signals.vehicleCount,
    cAct: signals.activeCertificateCount,
    cTot: signals.totalCertificateCount,
    // 「最終来店からの経過日」は 30 日単位のバケットで丸める (毎日変わると
    // キャッシュが効かないため)
    lastVisitBucket: bucketDays(signals.daysSinceLastVisit),
    upcoming: signals.upcomingReservation ? signals.upcomingReservation.scheduled_date : null,
    inProgress: !!signals.inProgressReservation,
    needsCert: !!signals.completedReservationWithoutCertificate,
    overdue: signals.overdueInvoiceCount,
    overdueTotal: signals.overdueInvoiceTotal,
    unpaid: signals.unpaidInvoiceCount,
    unpaidTotal: signals.unpaidInvoiceTotal,
    actions: signals.nextActions.map((a) => a.id).sort(),
  };
  return sha256Hex(JSON.stringify(payload));
}

function bucketDays(days: number | null): number | null {
  if (days == null) return null;
  if (days < 0) return -1; // 異常値はそのまま検知できるように
  return Math.floor(days / 30); // 0=今月 / 1=先月 / 6=半年 / ...
}
