/**
 * Webhook / 署名付きリクエストの汎用 timing-safe 検証ヘルパ。
 *
 * 既存の Stripe / Resend / Square / LINE / QStash 各 webhook ルートは
 * それぞれ専用の SDK / 自前ロジックで検証している。新規 PoC 連携先や
 * 自社で発行する署名で再利用できるよう、この一箇所に
 *   - HMAC-SHA256 計算
 *   - timingSafeEqual 比較
 *   - timestamp tolerance (replay 攻撃防御)
 * を集約する。
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export type HmacAlgo = "sha256" | "sha1" | "sha512";

/**
 * 与えられた payload に対する HMAC を計算し、hex / base64 で返す。
 */
export function computeHmac(payload: string | Buffer, secret: string, algo: HmacAlgo = "sha256"): Buffer {
  const data = typeof payload === "string" ? Buffer.from(payload, "utf8") : payload;
  return createHmac(algo, secret).update(data).digest();
}

export function computeHmacHex(payload: string | Buffer, secret: string, algo: HmacAlgo = "sha256"): string {
  return computeHmac(payload, secret, algo).toString("hex");
}

export function computeHmacBase64(payload: string | Buffer, secret: string, algo: HmacAlgo = "sha256"): string {
  return computeHmac(payload, secret, algo).toString("base64");
}

/**
 * Timing-safe な文字列比較 (任意エンコーディング)。
 * 長さ違いなら常に false を返し、長さが等しい場合のみ定数時間比較する。
 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * HMAC 署名検証。
 *
 * @param payload  生のリクエスト body (バイト整合性を担保するため text() 結果をそのまま渡す)
 * @param signature  ヘッダから受け取った署名 (hex または base64)
 * @param secret  webhook 共有秘密
 * @param options  encoding (hex|base64), algo, timestamp tolerance
 */
export function verifyHmacSignature(
  payload: string | Buffer,
  signature: string,
  secret: string,
  options: { encoding?: "hex" | "base64"; algo?: HmacAlgo } = {},
): boolean {
  if (!signature || !secret) return false;
  const algo = options.algo ?? "sha256";
  const encoding = options.encoding ?? "hex";
  const expected = computeHmac(payload, secret, algo);
  let received: Buffer;
  try {
    received = Buffer.from(signature, encoding);
  } catch {
    return false;
  }
  if (received.length !== expected.length) return false;
  return timingSafeEqual(received, expected);
}

/**
 * Timestamp + payload の合成署名 (Stripe / Slack スタイル) を検証する。
 *
 * `signedPayload = "{timestamp}.{rawBody}"` の HMAC を取り、tolerance 秒以内
 * に発行されたものだけ許可する。replay 攻撃を防ぐ標準パターン。
 *
 * @param tolerance  許容誤差 (秒)。既定 5 分。
 */
export function verifyTimestampedHmac(args: {
  rawBody: string | Buffer;
  timestamp: string | number;
  signature: string;
  secret: string;
  tolerance?: number;
  algo?: HmacAlgo;
  encoding?: "hex" | "base64";
}): { ok: true } | { ok: false; reason: string } {
  const ts = Number(args.timestamp);
  if (!Number.isFinite(ts) || ts <= 0) return { ok: false, reason: "invalid_timestamp" };

  const tolerance = args.tolerance ?? 300;
  const nowSec = Math.floor(Date.now() / 1000);
  const tsSec = ts > 1e12 ? Math.floor(ts / 1000) : ts; // ms / s 両対応
  if (Math.abs(nowSec - tsSec) > tolerance) {
    return { ok: false, reason: "timestamp_out_of_tolerance" };
  }

  const body = typeof args.rawBody === "string" ? args.rawBody : args.rawBody.toString("utf8");
  const signedPayload = `${tsSec}.${body}`;
  const ok = verifyHmacSignature(signedPayload, args.signature, args.secret, {
    algo: args.algo,
    encoding: args.encoding,
  });
  return ok ? { ok: true } : { ok: false, reason: "signature_mismatch" };
}
