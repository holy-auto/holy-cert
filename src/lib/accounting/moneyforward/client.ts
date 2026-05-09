/**
 * マネーフォワード クラウド API クライアント (skeleton)
 *
 * MVP 注意点:
 *  - パートナープログラム審査が通ってから本番接続可能
 *  - 審査通過後に endpoint と scope を本番値に揃える
 *  - 現状はインターフェース骨格のみ実装し、freee と同じ Provider 抽象に乗せる
 *
 * 認可: https://api.biz.moneyforward.com/authorize
 * トークン: https://api.biz.moneyforward.com/token
 * API base: https://api.biz.moneyforward.com/api/v1  (Cloud会計の場合)
 *
 * NOTE: postSalesEntry は審査通過後に「公式ドキュメント記載の transaction エンドポイント」
 *       に合わせて本番実装する。今は明示的に未対応エラーを投げる。
 */

import {
  type AccountingProviderClient,
  type OAuthTokenSet,
  type ProviderBootstrap,
  AccountingApiError,
} from "../types";

const AUTH_BASE = "https://api.biz.moneyforward.com";
const API_BASE = "https://api.biz.moneyforward.com/api/v1";

interface MFTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
  scope?: string;
  created_at?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;

async function mfFetch<T>(opts: {
  url: string;
  method?: "GET" | "POST";
  accessToken?: string;
  body?: unknown;
}): Promise<T> {
  const { url, method = "GET", accessToken, body } = opts;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (res.status === 401) {
      throw new AccountingApiError("moneyforward", 401, "unauthorized", "Access token rejected");
    }
    if (res.status === 429) {
      throw new AccountingApiError("moneyforward", 429, "rate_limited", "Rate limit exceeded");
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      const code = res.status >= 500 ? "server_error" : "bad_request";
      throw new AccountingApiError("moneyforward", res.status, code, `HTTP ${res.status}`, detail);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const moneyforwardClient: AccountingProviderClient = {
  provider: "moneyforward",

  buildAuthUrl({ state, redirectUri }) {
    const clientId = requireEnv("MF_CLIENT_ID");
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      state,
      // 審査通過後に必要なスコープへ差し替え (例: "mfc/invoice/data.write")
      scope: process.env.MF_SCOPES ?? "mfc/ac/data.read mfc/ac/data.write",
    });
    return `${AUTH_BASE}/authorize?${params.toString()}`;
  },

  async exchangeCode({ code, redirectUri }) {
    const data = await mfFetch<MFTokenResponse>({
      url: `${AUTH_BASE}/token`,
      method: "POST",
      body: {
        grant_type: "authorization_code",
        client_id: requireEnv("MF_CLIENT_ID"),
        client_secret: requireEnv("MF_CLIENT_SECRET"),
        code,
        redirect_uri: redirectUri,
      },
    });
    return tokensFromResponse(data);
  },

  async refreshAccessToken(refreshToken) {
    const data = await mfFetch<MFTokenResponse>({
      url: `${AUTH_BASE}/token`,
      method: "POST",
      body: {
        grant_type: "refresh_token",
        client_id: requireEnv("MF_CLIENT_ID"),
        client_secret: requireEnv("MF_CLIENT_SECRET"),
        refresh_token: refreshToken,
      },
    });
    return tokensFromResponse(data);
  },

  async bootstrap(accessToken): Promise<ProviderBootstrap> {
    // パートナー審査通過後に正式実装。それまでは最小情報を返す。
    // 実装時の参考エンドポイント:
    //   GET /api/v1/offices                  事業者一覧
    //   GET /api/v1/items                    勘定科目
    //   GET /api/v1/excise_codes             税区分
    //   GET /api/v1/partners                 取引先
    const offices = await mfFetch<{ offices: Array<{ id: string; office_name?: string; name?: string }> }>({
      url: `${API_BASE}/offices`,
      accessToken,
    }).catch(() => ({ offices: [] }));
    const office = offices.offices[0];
    if (!office) {
      throw new AccountingApiError(
        "moneyforward",
        400,
        "bad_request",
        "No office found — partner approval may be pending",
      );
    }
    return {
      company: { id: String(office.id), name: office.office_name ?? office.name ?? "事業者" },
      defaultSalesAccount: null,
      defaultTaxCode: null,
      defaultPartner: null,
    };
  },

  async postSalesEntry() {
    // パートナー審査通過 + 本番 API スキーマ確認後に実装
    throw new AccountingApiError(
      "moneyforward",
      501,
      "bad_request",
      "MoneyForward sales posting is pending partner-program approval. " +
        "Implement once endpoint contract is finalized.",
    );
  },
};

function tokensFromResponse(data: MFTokenResponse): OAuthTokenSet {
  const issuedAt = data.created_at ? data.created_at * 1000 : Date.now();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(issuedAt + data.expires_in * 1000).toISOString(),
  };
}
