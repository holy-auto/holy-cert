/**
 * 入力サイズ上限の共通定数。
 *
 * Zod スキーマで個別に max() を書くと付け忘れが起きるため、用途別の
 * 共通定数を一箇所に集約する。極端に巨大な文字列で
 *   - JSON parser を疲弊させる
 *   - サニタイザの正規表現を ReDoS させる
 *   - DB に膨大なデータを書き込ませる
 * といった DoS / リソース枯渇を防ぐ。
 *
 * 仕様の根拠:
 *   - email RFC 5321 = 254
 *   - URL RFC 3986 推奨上限 = 2048 (実運用では 1024 で十分)
 *   - JP の住所最大 = 約 200 文字 (建物名込みで 256 を上限)
 *   - メモ / 説明文 = ユーザー UX の観点で 4KB 以内を推奨
 *   - 自由入力 (long-form) = 64KB を hard limit (UI 警告は 16KB で出す)
 */

import { z } from "zod";

export const INPUT_LIMITS = {
  /** email の最大長 (RFC 5321) */
  EMAIL_MAX: 254,
  /** URL の最大長 */
  URL_MAX: 2048,
  /** 名前 / タイトル等の短い識別子 */
  NAME_MAX: 128,
  /** 住所 1 行 */
  ADDRESS_LINE_MAX: 256,
  /** 電話番号 (E.164 + フォーマット文字) */
  PHONE_MAX: 32,
  /** スラッグ */
  SLUG_MAX: 96,
  /** 短いメモ / コメント */
  MEMO_MAX: 4096,
  /** 説明文 / 本文 */
  DESCRIPTION_MAX: 16_384,
  /** 自由入力 (絶対上限) */
  LONG_TEXT_MAX: 65_536,
  /** UUID 36 chars + 余裕 */
  ID_MAX: 64,
  /** ログ / イベントの単一フィールド */
  LOG_FIELD_MAX: 1024,
  /** 配列要素数の上限 (一括処理 API) */
  BULK_ARRAY_MAX: 500,
  /** ファイル名 */
  FILENAME_MAX: 255,
} as const;

/** 共通の Zod ヘルパ。スキーマで `.string()` の代わりに使う。 */
export const SafeString = {
  email: () => z.string().trim().max(INPUT_LIMITS.EMAIL_MAX).email(),
  url: () => z.string().trim().max(INPUT_LIMITS.URL_MAX).url(),
  name: () => z.string().trim().min(1).max(INPUT_LIMITS.NAME_MAX),
  shortText: (max: number = INPUT_LIMITS.NAME_MAX) => z.string().trim().max(max),
  memo: () => z.string().max(INPUT_LIMITS.MEMO_MAX),
  description: () => z.string().max(INPUT_LIMITS.DESCRIPTION_MAX),
  longText: () => z.string().max(INPUT_LIMITS.LONG_TEXT_MAX),
  uuid: () => z.string().max(INPUT_LIMITS.ID_MAX).uuid(),
  slug: () =>
    z
      .string()
      .trim()
      .min(1)
      .max(INPUT_LIMITS.SLUG_MAX)
      .regex(/^[a-z0-9-]+$/, "slug must be [a-z0-9-]+"),
  phone: () => z.string().trim().max(INPUT_LIMITS.PHONE_MAX),
  filename: () =>
    z
      .string()
      .trim()
      .min(1)
      .max(INPUT_LIMITS.FILENAME_MAX)
      .refine((v) => !v.includes("\0") && !v.includes("..") && !v.includes("/") && !v.includes("\\"), {
        message: "filename must not contain path traversal characters",
      }),
} as const;

/**
 * 制御文字 (NUL / 改行以外の C0) を含む文字列を弾く refinement。
 * ログインジェクション / ターミナルエスケープ攻撃の防御。
 */
export function refineNoControlChars<T extends z.ZodString>(schema: T): T {
  return schema.refine(
    (v) => !/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(v),
    "input contains forbidden control characters",
  ) as unknown as T;
}
