import { unstable_cache } from "next/cache";
import { createServiceRoleAdmin } from "@/lib/supabase/admin";

/**
 * マーケティングページ用の成長指標を取得。
 *
 * 設計意図 (重要):
 *   Ledra は意図的に「ゼロからの成長過程」を訪問者に見せる方針。
 *   小さい数字を隠す閾値ロジックは持たず、現在値・直近の伸び・次のマイルストーン
 *   を透明に表示する。先行導入パートナーに「歴史の最初の数字」になってもらう
 *   ナラティブを成立させるため、表示用の文字列ではなく生の数値を返す。
 */

export type IssuanceMonth = {
  /** 表示ラベル (例: "5月") */
  label: string;
  /** その月に発行された施工証明書数 */
  value: number;
};

export type ChurnStats = {
  /** 月次解約率 (%)。母数0等で算出不能なら null */
  ratePct: number | null;
  /** 対象月ラベル (例: "2026年4月") */
  monthLabel: string;
  /** 実測可能か (母数があるか) */
  measurable: boolean;
};

export type MarketingStats = {
  /** 有効テナント (施工店) 数 */
  shopCount: number;
  /** 累計発行された施工証明書数 (certificates, draft を除く) */
  certificateCount: number;
  /** 過去30日に追加されたテナント数 */
  shopsLast30Days: number;
  /** 過去30日に発行された施工証明書数 */
  certificatesLast30Days: number;
  /** 直近6ヶ月の月別発行数 (古い月→新しい月) */
  issuanceByMonth: IssuanceMonth[];
  /** 前月完了分の会社全体 月次解約率。計測基盤未適用/不能なら null */
  churn: ChurnStats | null;
  /** DB から取れたかどうか (false の場合は 0 を返している) */
  isLive: boolean;
  /** 取得時刻 (ISO) — 「いつ時点の数字か」を明示する */
  fetchedAt: string;
};

const fallback: MarketingStats = {
  shopCount: 0,
  certificateCount: 0,
  shopsLast30Days: 0,
  certificatesLast30Days: 0,
  issuanceByMonth: [],
  churn: null,
  isLive: false,
  fetchedAt: new Date(0).toISOString(),
};

/** marketing_churn_stats() RPC の戻りを安全に ChurnStats へ */
function parseChurn(raw: unknown): ChurnStats | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const measurable = r.measurable === true;
  const ratePct = typeof r.ratePct === "number" ? r.ratePct : null;
  const monthLabel = typeof r.monthLabel === "string" ? r.monthLabel : "";
  if (!measurable || ratePct === null || !monthLabel) return null;
  return { ratePct, monthLabel, measurable };
}

/** 直近6ヶ月 (当月含む) の UTC 月境界を古い順に返す */
function lastSixMonthsUtc(): { label: string; start: string; end: string }[] {
  const now = new Date();
  const out: { label: string; start: string; end: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 1));
    out.push({
      label: `${start.getUTCMonth() + 1}月`,
      start: start.toISOString(),
      end: end.toISOString(),
    });
  }
  return out;
}

const fetchMarketingStats = unstable_cache(
  async (): Promise<MarketingStats> => {
    try {
      let supabase;
      try {
        supabase = createServiceRoleAdmin("marketing public forms — anonymous leads / aggregated stats");
      } catch {
        return fallback;
      }

      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const months = lastSixMonthsUtc();

      // 施工証明書 = certificates テーブル (draft は未発行なので除外)
      const issuedCerts = () =>
        supabase.from("certificates").select("id", { count: "exact", head: true }).neq("status", "draft");

      // churn RPC は計測基盤(マイグレーション)未適用だと error を返す。
      // .rpc は SQL エラーで reject せず {data,error} を返すため、
      // 他の実数値を巻き添えにせず安全に劣化する (churn=null → ページは計測中表示)。
      const [tenants, certs, tenants30, certs30, churnRes, ...monthly] = await Promise.all([
        supabase.from("tenants").select("id", { count: "exact", head: true }).eq("is_active", true),
        issuedCerts(),
        supabase
          .from("tenants")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true)
          .gte("created_at", since),
        issuedCerts().gte("created_at", since),
        supabase.rpc("marketing_churn_stats"),
        ...months.map((m) => issuedCerts().gte("created_at", m.start).lt("created_at", m.end)),
      ]);

      return {
        shopCount: tenants.count ?? 0,
        certificateCount: certs.count ?? 0,
        shopsLast30Days: tenants30.count ?? 0,
        certificatesLast30Days: certs30.count ?? 0,
        issuanceByMonth: months.map((m, i) => ({ label: m.label, value: monthly[i]?.count ?? 0 })),
        churn: churnRes.error ? null : parseChurn(churnRes.data),
        isLive: true,
        fetchedAt: new Date().toISOString(),
      };
    } catch {
      return fallback;
    }
  },
  ["marketing-stats-v3"],
  { revalidate: 3600 },
);

export async function getMarketingStats(): Promise<MarketingStats> {
  return fetchMarketingStats();
}

/** 成長マイルストーン (公開ロードマップ) — Ledra が向かう次の数字を率直に提示する */
export type Milestone = {
  shop?: number;
  cert?: number;
  label: string;
  caption: string;
};

export const SHOP_MILESTONES: Milestone[] = [
  { shop: 1, label: "1社目", caption: "最初のパートナーと、業界の記録文化を始める。" },
  { shop: 10, label: "10社", caption: "業態を超えた共通言語が芽吹く。" },
  { shop: 50, label: "50社", caption: "地域で「Ledra ありますか？」が成立する。" },
  { shop: 100, label: "100社", caption: "業界横断のネットワーク効果が立ち上がる。" },
  { shop: 500, label: "500社", caption: "施工品質の客観評価がインフラになる。" },
  { shop: 1000, label: "1,000社", caption: "業界の標準としての地位を獲得する。" },
];

export const CERT_MILESTONES: Milestone[] = [
  { cert: 100, label: "100件", caption: "発行プロセスがチームに馴染む段階。" },
  { cert: 1000, label: "1,000件", caption: "保険会社の照会で実データが活きる段階。" },
  { cert: 10000, label: "1万件", caption: "中古車流通で価値が認知される段階。" },
  { cert: 100000, label: "10万件", caption: "業界統計として参照される段階。" },
];

export function nextMilestone(current: number, list: Milestone[], key: "shop" | "cert"): Milestone | null {
  for (const m of list) {
    const target = m[key];
    if (typeof target === "number" && current < target) return m;
  }
  return null;
}

export function progressTo(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(1, current / target));
}
