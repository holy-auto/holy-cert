import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildSecretWrite, readSecret } from "../tenantSecrets";
import { encryptSecret } from "../secretBox";

const TEST_KEY = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=";

describe("tenantSecrets", () => {
  let originalKey: string | undefined;
  beforeEach(() => {
    originalKey = process.env.SECRET_ENCRYPTION_KEY;
    process.env.SECRET_ENCRYPTION_KEY = TEST_KEY;
  });
  afterEach(() => {
    if (originalKey === undefined) delete process.env.SECRET_ENCRYPTION_KEY;
    else process.env.SECRET_ENCRYPTION_KEY = originalKey;
  });

  describe("buildSecretWrite", () => {
    it("returns both plain and ciphertext when key is set", async () => {
      const out = await buildSecretWrite("super-secret");
      expect(out.plain).toBe("super-secret");
      expect(out.ciphertext).toMatch(/^v1\..+\..+$/);
    });

    it("returns nulls for empty input", async () => {
      expect(await buildSecretWrite(null)).toEqual({ plain: null, ciphertext: null });
      expect(await buildSecretWrite(undefined)).toEqual({ plain: null, ciphertext: null });
      expect(await buildSecretWrite("")).toEqual({ plain: null, ciphertext: null });
    });

    it("falls back to plain-only when key is missing", async () => {
      delete process.env.SECRET_ENCRYPTION_KEY;
      const out = await buildSecretWrite("still-need-to-store");
      expect(out.plain).toBe("still-need-to-store");
      expect(out.ciphertext).toBeNull();
    });
  });

  describe("readSecret", () => {
    it("prefers ciphertext when both columns are populated", async () => {
      const cipher = await encryptSecret("encrypted-value");
      const result = await readSecret(cipher, "plain-value", "test");
      expect(result).toBe("encrypted-value");
    });

    it("falls back to plain when ciphertext is null", async () => {
      const result = await readSecret(null, "plain-only-value", "test");
      expect(result).toBe("plain-only-value");
    });

    it("falls back to plain when ciphertext fails to decrypt", async () => {
      const cipher = await encryptSecret("encrypted-value");
      // 鍵を別のものに変える → 復号失敗
      process.env.SECRET_ENCRYPTION_KEY = "/////////////////////////////////////////w==";
      const result = await readSecret(cipher, "plain-fallback", "test");
      expect(result).toBe("plain-fallback");
    });

    it("returns null when both columns are empty", async () => {
      expect(await readSecret(null, null, "test")).toBeNull();
      expect(await readSecret(undefined, undefined, "test")).toBeNull();
    });

    it("returns null when ciphertext fails and plain is also null", async () => {
      const cipher = await encryptSecret("encrypted-value");
      process.env.SECRET_ENCRYPTION_KEY = "/////////////////////////////////////////w==";
      const result = await readSecret(cipher, null, "test");
      expect(result).toBeNull();
    });

    it("ignores ciphertext that does not look like an envelope", async () => {
      // 平文がそのまま ciphertext 列に紛れ込んでいるケース
      const result = await readSecret("not-an-envelope", "real-plain", "test");
      expect(result).toBe("real-plain");
    });
  });
});
