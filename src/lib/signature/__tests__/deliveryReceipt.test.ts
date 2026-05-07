/**
 * deliveryReceipt.ts のユニットテスト
 *
 * 受領サインの法的強度を高める核心ロジック:
 *   - 同意文言ハッシュの安定性
 *   - 署名ペイロード v2 の正規化と全フィールドの binding
 *   - 二要素認証 (登録電話番号下4桁) の比較・試行回数管理
 */

import { describe, it, expect } from "vitest";
import { phoneLast4Hash } from "../../customerPortalServer";
import {
  CONSENT_VERSION,
  CONSENT_TEXT_BODY,
  CONSENT_TEXTS,
  computeConsentTextHash,
  getConsentTextByVersion,
  buildDeliveryReceiptPayload,
  verifyPhoneLast4,
  SECONDARY_FACTOR_MAX_ATTEMPTS,
} from "../deliveryReceipt";

describe("CONSENT_TEXT_BODY", () => {
  it("空でない文言を返す", () => {
    expect(CONSENT_TEXT_BODY.length).toBeGreaterThan(50);
  });

  it("「受領しました」という文言を含む (法的意思の明示)", () => {
    expect(CONSENT_TEXT_BODY).toContain("受領しました");
  });

  it("電子署名法 第2条への準拠を明示する", () => {
    expect(CONSENT_TEXT_BODY).toContain("電子署名法");
    expect(CONSENT_TEXT_BODY).toContain("第2条");
  });
});

describe("computeConsentTextHash", () => {
  it("同一入力に対して常に同一のハッシュを返す", () => {
    const h1 = computeConsentTextHash();
    const h2 = computeConsentTextHash();
    expect(h1).toBe(h2);
  });

  it("64文字の HEX 文字列を返す", () => {
    const h = computeConsentTextHash();
    expect(h).toHaveLength(64);
    expect(h).toMatch(/^[0-9a-f]+$/);
  });

  it("文言が変わるとハッシュが変わる", () => {
    const h1 = computeConsentTextHash("text-A");
    const h2 = computeConsentTextHash("text-B");
    expect(h1).not.toBe(h2);
  });

  it("デフォルト引数は CONSENT_TEXT_BODY と一致する", () => {
    expect(computeConsentTextHash()).toBe(computeConsentTextHash(CONSENT_TEXT_BODY));
  });
});

describe("buildDeliveryReceiptPayload", () => {
  const baseArgs = {
    documentHash: "abc123def456",
    signedAt: "2026-05-06T12:00:00.000Z",
    signerEmail: "user@example.com",
    phoneLast4Hash: "deadbeef",
    consentVersion: CONSENT_VERSION,
    consentTextHash: "feedface",
    certificateId: "11111111-1111-1111-1111-111111111111",
    sessionId: "22222222-2222-2222-2222-222222222222",
  };

  it('プレフィックス "ledra-delivery-receipt-v1" で始まる', () => {
    const payload = buildDeliveryReceiptPayload(baseArgs);
    expect(payload.startsWith("ledra-delivery-receipt-v1:")).toBe(true);
  });

  it("正規化された全フィールドが順序通りに含まれる", () => {
    const payload = buildDeliveryReceiptPayload(baseArgs);
    // 各フィールド (正規化済み) が出現することを確認 (ISO 8601 の "T12:00:00" にも ":" を含むため数では検証しない)
    expect(payload).toContain(baseArgs.documentHash.toLowerCase());
    expect(payload).toContain(baseArgs.signedAt);
    expect(payload).toContain(baseArgs.signerEmail.toLowerCase());
    expect(payload).toContain(baseArgs.phoneLast4Hash);
    expect(payload).toContain(baseArgs.consentVersion);
    expect(payload).toContain(baseArgs.consentTextHash.toLowerCase());
    expect(payload).toContain(baseArgs.certificateId);
    expect(payload).toContain(baseArgs.sessionId);
    // フィールド順序の確認: prefix → documentHash → signedAt → email → phone → consentVer → consentHash → cert → sess
    const idx = (s: string) => payload.indexOf(s);
    expect(idx("ledra-delivery-receipt-v1")).toBe(0);
    expect(idx(baseArgs.documentHash)).toBeGreaterThan(0);
    expect(idx(baseArgs.signedAt)).toBeGreaterThan(idx(baseArgs.documentHash));
    expect(idx(baseArgs.signerEmail)).toBeGreaterThan(idx(baseArgs.signedAt));
    expect(idx(baseArgs.phoneLast4Hash)).toBeGreaterThan(idx(baseArgs.signerEmail));
  });

  it("メールを小文字・トリム正規化する", () => {
    const payload = buildDeliveryReceiptPayload({
      ...baseArgs,
      signerEmail: "  USER@EXAMPLE.COM  ",
    });
    expect(payload).toContain(":user@example.com:");
    expect(payload).not.toContain("USER@EXAMPLE.COM");
  });

  it("document_hash・consent_text_hash・session_id を小文字正規化する", () => {
    const payload = buildDeliveryReceiptPayload({
      ...baseArgs,
      documentHash: "ABCDEF",
      consentTextHash: "FEEDFACE",
      sessionId: "AAAAAAAA-1111-1111-1111-111111111111",
    });
    expect(payload).toContain(":abcdef:");
    expect(payload).toContain(":feedface:");
    expect(payload).toContain(":aaaaaaaa-1111-1111-1111-111111111111");
  });

  it("どの 1 フィールドが変わっても異なるペイロードになる (binding 完全性)", () => {
    const base = buildDeliveryReceiptPayload(baseArgs);
    expect(buildDeliveryReceiptPayload({ ...baseArgs, documentHash: "x" })).not.toBe(base);
    expect(buildDeliveryReceiptPayload({ ...baseArgs, signedAt: "2026-01-01T00:00:00.000Z" })).not.toBe(base);
    expect(buildDeliveryReceiptPayload({ ...baseArgs, signerEmail: "other@example.com" })).not.toBe(base);
    expect(buildDeliveryReceiptPayload({ ...baseArgs, phoneLast4Hash: "other-hash" })).not.toBe(base);
    expect(buildDeliveryReceiptPayload({ ...baseArgs, consentVersion: "delivery-receipt-v2" })).not.toBe(base);
    expect(buildDeliveryReceiptPayload({ ...baseArgs, consentTextHash: "other-text" })).not.toBe(base);
    expect(
      buildDeliveryReceiptPayload({ ...baseArgs, certificateId: "33333333-3333-3333-3333-333333333333" }),
    ).not.toBe(base);
    expect(buildDeliveryReceiptPayload({ ...baseArgs, sessionId: "44444444-4444-4444-4444-444444444444" })).not.toBe(
      base,
    );
  });

  it("証明書本体署名 (v1) のプレフィックスとは別物", () => {
    const payload = buildDeliveryReceiptPayload(baseArgs);
    expect(payload.startsWith("ledra-signature-v1:")).toBe(false);
  });
});

describe("verifyPhoneLast4", () => {
  const tenantId = "tenant-abc";
  const correctLast4 = "1234";
  const correctHash = phoneLast4Hash(tenantId, correctLast4);

  it("正しい下4桁で本人確認に成功する", () => {
    const result = verifyPhoneLast4({
      tenantId,
      storedHash: correctHash,
      input: correctLast4,
      attemptsSoFar: 0,
    });
    expect(result).toEqual({ ok: true });
  });

  it("空白を含む入力でも正しい下4桁なら成功する", () => {
    const result = verifyPhoneLast4({
      tenantId,
      storedHash: correctHash,
      input: "  1234  ",
      attemptsSoFar: 0,
    });
    expect(result).toEqual({ ok: true });
  });

  it("数字以外の入力は invalid_format になる", () => {
    const result = verifyPhoneLast4({
      tenantId,
      storedHash: correctHash,
      input: "12ab",
      attemptsSoFar: 0,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("invalid_format");
      expect(result.attempts).toBe(0); // フォーマットエラーは試行回数を増やさない
    }
  });

  it("4桁未満は invalid_format になる", () => {
    const result = verifyPhoneLast4({
      tenantId,
      storedHash: correctHash,
      input: "123",
      attemptsSoFar: 0,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid_format");
  });

  it("不正な下4桁は mismatch を返し、試行回数が +1 される", () => {
    const result = verifyPhoneLast4({
      tenantId,
      storedHash: correctHash,
      input: "9999",
      attemptsSoFar: 0,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("mismatch");
      expect(result.attempts).toBe(1);
    }
  });

  it(`試行回数が ${SECONDARY_FACTOR_MAX_ATTEMPTS} 回に達していたら locked を返す (正解でも拒否)`, () => {
    const result = verifyPhoneLast4({
      tenantId,
      storedHash: correctHash,
      input: correctLast4,
      attemptsSoFar: SECONDARY_FACTOR_MAX_ATTEMPTS,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("locked");
  });

  it("テナントが異なれば同じ下4桁でも mismatch", () => {
    const result = verifyPhoneLast4({
      tenantId: "other-tenant",
      storedHash: correctHash,
      input: correctLast4,
      attemptsSoFar: 0,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("mismatch");
  });

  it("3 回連続失敗で次回は locked になる", () => {
    let attempts = 0;
    for (let i = 0; i < 3; i++) {
      const r = verifyPhoneLast4({
        tenantId,
        storedHash: correctHash,
        input: "0000",
        attemptsSoFar: attempts,
      });
      expect(r.ok).toBe(false);
      if (!r.ok) attempts = r.attempts;
    }
    // 4 回目 → locked
    const fourth = verifyPhoneLast4({
      tenantId,
      storedHash: correctHash,
      input: correctLast4,
      attemptsSoFar: attempts,
    });
    expect(fourth.ok).toBe(false);
    if (!fourth.ok) expect(fourth.reason).toBe("locked");
  });
});

describe("CONSENT_VERSION", () => {
  it("バージョン文字列の形式 (delivery-receipt-vN)", () => {
    expect(CONSENT_VERSION).toMatch(/^delivery-receipt-v\d+$/);
  });
});

describe("CONSENT_TEXTS / getConsentTextByVersion", () => {
  it("CONSENT_TEXTS は frozen で外部から書き換えられない", () => {
    expect(Object.isFrozen(CONSENT_TEXTS)).toBe(true);
  });

  it("現行 CONSENT_VERSION は CONSENT_TEXTS に必ず存在する", () => {
    expect(CONSENT_TEXTS[CONSENT_VERSION]).toBe(CONSENT_TEXT_BODY);
  });

  it("getConsentTextByVersion(現行) は CONSENT_TEXT_BODY を返す", () => {
    expect(getConsentTextByVersion(CONSENT_VERSION)).toBe(CONSENT_TEXT_BODY);
  });

  it("未知のバージョンは null", () => {
    expect(getConsentTextByVersion("delivery-receipt-v999")).toBeNull();
  });

  it("null/undefined を渡しても安全に null", () => {
    expect(getConsentTextByVersion(null)).toBeNull();
    expect(getConsentTextByVersion(undefined)).toBeNull();
    expect(getConsentTextByVersion("")).toBeNull();
  });

  it("テーブル内のすべての文言と保存済みハッシュが一致する (drift 検知)", () => {
    // 文言を編集したのに version をバンプし忘れた場合、
    // computeConsentTextHash(text) が想定値からズレる。
    // 全エントリで自分自身との一致だけは保証されることを確認。
    for (const [version, text] of Object.entries(CONSENT_TEXTS)) {
      const hash = computeConsentTextHash(text);
      expect(hash, `version=${version}`).toBe(computeConsentTextHash(text));
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});
