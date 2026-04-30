import { ja } from "./messages/ja";
import { en } from "./messages/en";
import type { Messages } from "./messages/ja";

export type Locale = "ja" | "en";

const TABLES: Record<Locale, Messages> = { ja, en };

// 現状のデフォルト。Phase 2 で i18nStore + Settings 画面から切替できるようにする想定。
let currentLocale: Locale = "ja";

export function setLocale(locale: Locale) {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

// ── 型レベルでドットパス (leaf のみ) を生成するヘルパー ──
type LeafPaths<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? Prefix extends ""
      ? K
      : `${Prefix}.${K}`
    : T[K] extends Record<string, unknown>
      ? LeafPaths<T[K], Prefix extends "" ? K : `${Prefix}.${K}`>
      : never;
}[keyof T & string];

export type MessageKey = LeafPaths<Messages>;

/**
 * ドット区切りキーで翻訳を取得する。
 *
 * @example
 *   t("home.today_reservations")
 *   t("common.save")
 *
 * 未定義キーは __DEV__ で警告を出してキー自体を返す（壊れない）。
 */
export function t(key: MessageKey): string {
  const table = TABLES[currentLocale];
  // ドット区切りで降りる
  const parts = key.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = table;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) {
      cur = cur[p];
    } else {
      cur = undefined;
      break;
    }
  }
  if (typeof cur !== "string") {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      // eslint-disable-next-line no-console
      console.warn(`[i18n] missing key: ${key}`);
    }
    return key;
  }
  return cur;
}

/**
 * Hook 版（再描画トリガとして locale を依存に持つ用途のため、
 * 現状は単純な t をそのまま返す。Phase 2 で zustand と組み合わせる）。
 */
export function useT() {
  return t;
}
