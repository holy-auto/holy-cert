/**
 * Tenant 単位の機微情報 (LINE channel secret / Square OAuth tokens 等) を
 * DB に保存する前に暗号化するためのヘルパー。
 *
 * - AES-256-GCM (Web Crypto API)
 * - envelope format: `v1.<iv_b64url>.<ciphertext_with_tag_b64url>`
 *   - `v1` は鍵 / アルゴリズムの version プレフィックス。将来 KMS や別鍵に
 *     差し替える場合は `v2.kms.<key_id>.<ciphertext>` のように拡張する。
 * - 鍵: env `SECRET_ENCRYPTION_KEY` (base64 で 32 バイト = 256 bit)。
 *
 * 設計メモ:
 * - GCM は IV (96bit) を毎回ランダム生成 (`crypto.getRandomValues`) する
 *   ことで、同じ平文でも毎回異なる暗号文になる。同じ IV を再利用しない
 *   かぎり機密性は保たれる。
 * - Web Crypto の `AES-GCM` は authentication tag を ciphertext の末尾に
 *   append して返すため、別途 tag を格納する必要はない。
 * - 復号失敗時は例外を throw する。呼び出し側 (tenantSecrets.ts) で plain
 *   列にフォールバックするかは判断する。
 */

const VERSION = "v1";
const VERSION_PREFIX = `${VERSION}.`;
const IV_BYTES = 12;

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  // btoa は Node 18+ / Edge / Browser で利用可能
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(input: string): Uint8Array {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64Decode(input: string): Uint8Array {
  // 標準 base64 (鍵 env で使う想定)。padded / unpadded の両方を受け入れる。
  const padded = input + "=".repeat((4 - (input.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** 鍵が env から取れるかを判定。dual-write 期間中の guard に使う。 */
export function hasEncryptionKey(): boolean {
  const k = process.env.SECRET_ENCRYPTION_KEY;
  if (!k) return false;
  try {
    const bytes = base64Decode(k);
    return bytes.length === 32;
  } catch {
    return false;
  }
}

let cachedKeyPromise: Promise<CryptoKey> | null = null;
let cachedKeyEnv: string | null = null;

async function getKey(): Promise<CryptoKey> {
  const keyEnv = process.env.SECRET_ENCRYPTION_KEY;
  if (!keyEnv) {
    throw new Error("SECRET_ENCRYPTION_KEY is not set");
  }
  // env が変わった (テスト / プロセス内の rotation) 場合は再ロード
  if (cachedKeyPromise && cachedKeyEnv === keyEnv) return cachedKeyPromise;
  const keyBytes = base64Decode(keyEnv);
  if (keyBytes.length !== 32) {
    throw new Error("SECRET_ENCRYPTION_KEY must decode to exactly 32 bytes");
  }
  cachedKeyEnv = keyEnv;
  cachedKeyPromise = crypto.subtle.importKey("raw", keyBytes as BufferSource, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
  return cachedKeyPromise;
}

/**
 * 平文を暗号化して envelope 文字列を返す。
 * @throws SECRET_ENCRYPTION_KEY が無いか不正な場合
 */
export async function encryptSecret(plain: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
  return `${VERSION_PREFIX}${base64UrlEncode(iv)}.${base64UrlEncode(new Uint8Array(ciphertext))}`;
}

/**
 * envelope 文字列を復号して平文を返す。
 * @throws envelope が破損 / 鍵が違う / SECRET_ENCRYPTION_KEY が無い場合
 */
export async function decryptSecret(envelope: string): Promise<string> {
  if (!envelope.startsWith(VERSION_PREFIX)) {
    throw new Error("Unsupported secret envelope version");
  }
  const rest = envelope.slice(VERSION_PREFIX.length);
  const parts = rest.split(".");
  if (parts.length !== 2) {
    throw new Error("Malformed secret envelope");
  }
  const [ivB64, ctB64] = parts;
  const iv = base64UrlDecode(ivB64);
  const ciphertext = base64UrlDecode(ctB64);
  if (iv.length !== IV_BYTES) {
    throw new Error("Malformed secret envelope: invalid IV length");
  }
  const key = await getKey();
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    ciphertext as BufferSource,
  );
  return new TextDecoder().decode(plain);
}

/** envelope 形式 (v1.iv.ct) かを軽くチェック。dual-read 時の早期判定に使う。 */
export function looksLikeEnvelope(value: string | null | undefined): boolean {
  if (!value) return false;
  if (!value.startsWith(VERSION_PREFIX)) return false;
  const rest = value.slice(VERSION_PREFIX.length);
  return rest.split(".").length === 2;
}
