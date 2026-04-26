/**
 * テナント秘密情報 (LINE / Square) の **DB 書き込み・読み出しヘルパー**。
 *
 * dual-write / dual-read の移行期間中 (PR1 → PR3 まで) は、
 * 平文列と ciphertext 列が両方存在する。本ヘルパーで一元化することで
 * 各 route の差分を最小化し、後続 PR で読み書きの優先度を切り替える時も
 * このファイルだけを書き換えれば済む。
 *
 * ## ライフサイクル
 *
 *  - **PR1 (現在)**: 書き込み = dual-write (平文 + ciphertext)
 *                    読み出し = ciphertext 優先 / 失敗時は平文 fallback
 *  - **PR2**:        既存平文を全件 backfill 。読み出しは ciphertext のみ
 *  - **PR3**:        平文列 DROP 。dual-write 終了
 *
 * ## SECRET_ENCRYPTION_KEY が未設定の環境
 *
 *  - encryptSecret() は throw するため、`hasEncryptionKey()` で guard し、
 *    無ければ平文のみを書く。dev / preview 環境で env を設定し忘れても
 *    アプリケーションが落ちないようにするための fallback。
 *  - 本番では必ず env を設定し、未設定時は warning ログで気付けるようにする。
 */

import { encryptSecret, decryptSecret, hasEncryptionKey, looksLikeEnvelope } from "./secretBox";
import { logger } from "@/lib/logger";

/**
 * 1 つの平文値から、DB に書き込むべき `{ plain_col, ciphertext_col }` の
 * ペアを生成する。
 *
 * @example
 *   const { plain, ciphertext } = await buildSecretWrite(secretValue);
 *   await admin.from("tenants").update({
 *     line_channel_secret: plain,
 *     line_channel_secret_ciphertext: ciphertext,
 *   }).eq("id", tenantId);
 *
 * - value が null / 空文字なら両方 null (clear 操作)。
 * - SECRET_ENCRYPTION_KEY が未設定なら ciphertext は null + warning ログ。
 */
export async function buildSecretWrite(
  value: string | null | undefined,
): Promise<{ plain: string | null; ciphertext: string | null }> {
  if (!value) return { plain: null, ciphertext: null };
  if (!hasEncryptionKey()) {
    logger.warn("tenantSecrets: SECRET_ENCRYPTION_KEY is not set — writing plain only", {
      // 値そのものはログに出さない
      mode: "plain_only_fallback",
    });
    return { plain: value, ciphertext: null };
  }
  try {
    const ciphertext = await encryptSecret(value);
    return { plain: value, ciphertext };
  } catch (err) {
    logger.error("tenantSecrets: encryption failed — writing plain only", err, {
      mode: "plain_only_fallback",
    });
    return { plain: value, ciphertext: null };
  }
}

/**
 * dual-read: ciphertext 列を優先し、失敗時のみ平文列にフォールバック。
 *
 * @example
 *   const channelSecret = await readSecret(
 *     row.line_channel_secret_ciphertext,
 *     row.line_channel_secret,
 *     "tenants.line_channel_secret",
 *   );
 *
 * @param ciphertext DB から取得した暗号化列の値 (nullable)
 * @param plain      DB から取得した平文列の値 (nullable)
 * @param label      ログ用ラベル (テーブル/列名など)
 * @returns 復号成功した平文、または平文列の値、どちらも無ければ null
 */
export async function readSecret(
  ciphertext: string | null | undefined,
  plain: string | null | undefined,
  label: string,
): Promise<string | null> {
  if (ciphertext && looksLikeEnvelope(ciphertext)) {
    try {
      return await decryptSecret(ciphertext);
    } catch (err) {
      // 鍵ローテ事故 / DB 破損などのケース。平文列がまだあれば fallback。
      logger.error("tenantSecrets: decryption failed — falling back to plain column", err, {
        label,
      });
    }
  }
  return plain ?? null;
}
