/**
 * 会計ソフト連携 (freee / マネーフォワード) の共通型・インターフェース。
 *
 * 加盟店にとっては「どっちの会計ソフトを使ってるか」だけで体験が変わらないよう、
 * Provider 抽象に乗せて実装を切り替え可能にしている。
 *
 * - OAuth: Authorization Code (PKCE 任意) — 両社とも準拠
 * - 仕訳投入: source_type ごとに 1 件 = 1 deal/transaction
 * - 通貨: JPY 固定 (国内会計ソフトのみ対応)
 */

export type AccountingProvider = "freee" | "moneyforward";

export type SyncSourceType = "document" | "pos_checkout" | "stripe_payment";

export type IntegrationStatus = "pending" | "active" | "disconnected" | "error";

/** OAuth トークン交換結果 (provider 共通形) */
export interface OAuthTokenSet {
  accessToken: string;
  refreshToken: string;
  /** ISO8601 (UTC) — DB には timestamptz で入る */
  expiresAt: string;
}

/** 連携先の事業所情報 */
export interface RemoteCompany {
  id: string;
  name: string;
}

/** 勘定科目 (provider から取得して default を自動設定するのに使う) */
export interface RemoteAccountItem {
  id: string;
  name: string;
  /** "income" / "expense" 等。provider 固有のカテゴリ文字列 */
  category?: string;
}

/** 税区分 */
export interface RemoteTaxCode {
  /** provider 内部の税区分コード (freee: tax_code, MF: excise_id) */
  code: string;
  rate: number; // 0 / 8 / 10
  name: string;
}

/** 取引先 (顧客) */
export interface RemotePartner {
  id: string;
  name: string;
}

/**
 * 1 件の売上 (請求書 / POS / Stripe決済) を会計仕訳に変換するための中間表現。
 *
 * provider 固有の API 形式 (freee deal / MF transaction) には mapper が変換する。
 */
export interface LedraSalesEntry {
  /** 冪等キー: 同じ source_type+source_id を 2 度送らない */
  sourceType: SyncSourceType;
  sourceId: string; // ledra側のUUID

  /** 発生日 (YYYY-MM-DD) */
  issuedDate: string;

  /** 取引先名 — provider 側で取引先マスタに自動 upsert される */
  partnerName?: string;
  /** 入金口座 (現預金 / Stripe未収金 / 売掛金 のどれか) */
  receiptAccount: "cash" | "bank" | "receivable" | "stripe_receivable";

  /** 税率ごとの内訳 (適格請求書対応) */
  breakdown: SalesBreakdown[];

  /** 摘要 (例: "請求書 #INV-2026-001 / 山田太郎様") */
  description: string;

  /** 元データへの参照 (UI で「どの請求書がソースか」を辿るためのメタ) */
  ledraRef: {
    docNumber?: string;
    customerName?: string;
    customerId?: string;
  };
}

export interface SalesBreakdown {
  rate: 0 | 8 | 10;
  /** 税抜金額 (整数, JPY) */
  subtotal: number;
  /** 消費税額 (整数, JPY) */
  tax: number;
}

/** 連携時に provider から取得する初期セットアップ情報 */
export interface ProviderBootstrap {
  company: RemoteCompany;
  defaultSalesAccount: RemoteAccountItem | null;
  defaultTaxCode: RemoteTaxCode | null;
  defaultPartner: RemotePartner | null;
}

/**
 * Provider が実装すべき最小インターフェース。
 *
 * cron と manual sync は同じこのインターフェースを呼ぶだけで動くようにする。
 */
export interface AccountingProviderClient {
  readonly provider: AccountingProvider;

  /** OAuth 認可 URL を組み立て (state は呼び出し側が渡す) */
  buildAuthUrl(opts: { state: string; redirectUri: string }): string;

  /** code → token 交換 */
  exchangeCode(opts: { code: string; redirectUri: string }): Promise<OAuthTokenSet>;

  /** refresh_token → 新しい token セット */
  refreshAccessToken(refreshToken: string): Promise<OAuthTokenSet>;

  /** 連携完了直後に走る初期セットアップ (会社・勘定科目・税区分の自動取得) */
  bootstrap(accessToken: string): Promise<ProviderBootstrap>;

  /**
   * 売上仕訳を 1 件投入する。
   * @returns provider 側で作られた deal/transaction ID
   */
  postSalesEntry(opts: {
    accessToken: string;
    companyId: string;
    entry: LedraSalesEntry;
    defaults: {
      salesAccountId: string;
      taxCode: string;
      partnerId: string | null;
    };
  }): Promise<{ externalId: string }>;
}

/** Provider 共通エラー — sync 側で 401/429 を判定するために投げ分ける */
export class AccountingApiError extends Error {
  constructor(
    public readonly provider: AccountingProvider,
    public readonly status: number,
    public readonly code: "unauthorized" | "rate_limited" | "bad_request" | "server_error" | "unknown",
    message: string,
    public readonly details?: unknown,
  ) {
    super(`[${provider}] ${code}: ${message}`);
    this.name = "AccountingApiError";
  }
}
