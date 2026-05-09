/**
 * accounting_integrations 行のトークン読み書きヘルパー。
 *
 * - Square と同じ envelope 暗号化 (`@/lib/crypto/secretBox`) を流用
 * - 復号失敗は null を返し、呼び出し側で「再認可フローへ誘導」できるようにする
 */

import { buildSecretWrite, readSecret } from "@/lib/crypto/tenantSecrets";
import type { OAuthTokenSet, AccountingProvider } from "./types";

export interface PersistedTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

interface TokenRow {
  access_token_ciphertext: string | null;
  refresh_token_ciphertext: string | null;
  token_expires_at: string | null;
}

export async function readTokensFromRow(row: TokenRow, provider: AccountingProvider): Promise<PersistedTokens | null> {
  const accessToken = await readSecret(row.access_token_ciphertext, `accounting_integrations.${provider}.access_token`);
  const refreshToken = await readSecret(
    row.refresh_token_ciphertext,
    `accounting_integrations.${provider}.refresh_token`,
  );
  if (!accessToken || !refreshToken || !row.token_expires_at) return null;
  return {
    accessToken,
    refreshToken,
    expiresAt: new Date(row.token_expires_at),
  };
}

export async function buildTokenWritePayload(tokens: OAuthTokenSet): Promise<{
  access_token_ciphertext: string | null;
  refresh_token_ciphertext: string | null;
  token_expires_at: string;
}> {
  const access = await buildSecretWrite(tokens.accessToken);
  const refresh = await buildSecretWrite(tokens.refreshToken);
  return {
    access_token_ciphertext: access.ciphertext,
    refresh_token_ciphertext: refresh.ciphertext,
    token_expires_at: tokens.expiresAt,
  };
}

/** access_token が 5 分以内に切れるなら refresh が必要 */
export function isTokenExpiringSoon(expiresAt: Date, now: Date = new Date()): boolean {
  const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;
  return expiresAt.getTime() - now.getTime() < REFRESH_THRESHOLD_MS;
}
