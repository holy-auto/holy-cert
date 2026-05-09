/**
 * Provider レジストリ — 文字列 (`'freee' | 'moneyforward'`) から
 * 実装クライアントを取り出す単純なファクトリ。
 *
 * ルートからは provider 名 (URL param) しか分からないので、必ずこの
 * レジストリ経由でインスタンスを取得する。
 */

import { freeeClient } from "./freee/client";
import { moneyforwardClient } from "./moneyforward/client";
import type { AccountingProvider, AccountingProviderClient } from "./types";

const REGISTRY: Record<AccountingProvider, AccountingProviderClient> = {
  freee: freeeClient,
  moneyforward: moneyforwardClient,
};

export function getAccountingProviderClient(provider: AccountingProvider): AccountingProviderClient {
  return REGISTRY[provider];
}

export function isAccountingProvider(value: string): value is AccountingProvider {
  return value === "freee" || value === "moneyforward";
}

/**
 * 加盟店向け表示名 — UI のラベルやメール文面に使う。
 */
export function providerDisplayName(provider: AccountingProvider): string {
  return provider === "freee" ? "freee" : "マネーフォワード クラウド";
}
