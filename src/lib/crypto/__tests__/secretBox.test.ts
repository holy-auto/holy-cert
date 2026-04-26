import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encryptSecret, decryptSecret, hasEncryptionKey, looksLikeEnvelope } from "../secretBox";

// 32 バイト = 256bit を base64 にエンコードしたサンプル鍵
const TEST_KEY = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=";

describe("secretBox", () => {
  let originalKey: string | undefined;
  beforeEach(() => {
    originalKey = process.env.SECRET_ENCRYPTION_KEY;
    process.env.SECRET_ENCRYPTION_KEY = TEST_KEY;
  });
  afterEach(() => {
    if (originalKey === undefined) delete process.env.SECRET_ENCRYPTION_KEY;
    else process.env.SECRET_ENCRYPTION_KEY = originalKey;
  });

  it("encrypts and decrypts a string round-trip", async () => {
    const plain = "sk-square-access-token-abc123";
    const envelope = await encryptSecret(plain);
    expect(envelope.startsWith("v1.")).toBe(true);
    const decrypted = await decryptSecret(envelope);
    expect(decrypted).toBe(plain);
  });

  it("produces a different ciphertext each call (random IV)", async () => {
    const plain = "the-same-secret";
    const a = await encryptSecret(plain);
    const b = await encryptSecret(plain);
    expect(a).not.toBe(b);
    expect(await decryptSecret(a)).toBe(plain);
    expect(await decryptSecret(b)).toBe(plain);
  });

  it("decrypts a multi-byte UTF-8 secret correctly", async () => {
    const plain = "日本語の機微情報🔐 + emoji";
    const envelope = await encryptSecret(plain);
    expect(await decryptSecret(envelope)).toBe(plain);
  });

  it("throws when SECRET_ENCRYPTION_KEY is missing", async () => {
    delete process.env.SECRET_ENCRYPTION_KEY;
    await expect(encryptSecret("x")).rejects.toThrow(/SECRET_ENCRYPTION_KEY/);
  });

  it("throws when SECRET_ENCRYPTION_KEY is the wrong length", async () => {
    process.env.SECRET_ENCRYPTION_KEY = "dG9vLXNob3J0"; // 9 bytes
    await expect(encryptSecret("x")).rejects.toThrow(/32 bytes/);
  });

  it("rejects an envelope encrypted with a different key", async () => {
    const plain = "another-secret";
    const envelope = await encryptSecret(plain);
    // 鍵を別の値に差し替え
    process.env.SECRET_ENCRYPTION_KEY = "/////////////////////////////////////////w==";
    await expect(decryptSecret(envelope)).rejects.toThrow();
  });

  it("rejects a malformed envelope", async () => {
    await expect(decryptSecret("not-an-envelope")).rejects.toThrow();
    await expect(decryptSecret("v1.only-one-segment")).rejects.toThrow();
    await expect(decryptSecret("v2.aaaa.bbbb")).rejects.toThrow(/version/);
  });

  it("rejects a tampered ciphertext (GCM auth tag mismatch)", async () => {
    const envelope = await encryptSecret("integrity-check");
    // 末尾を 1 文字変えると auth tag が崩れる
    const tampered = envelope.slice(0, -1) + (envelope.endsWith("A") ? "B" : "A");
    await expect(decryptSecret(tampered)).rejects.toThrow();
  });

  describe("hasEncryptionKey", () => {
    it("returns true for a valid key", () => {
      expect(hasEncryptionKey()).toBe(true);
    });
    it("returns false when missing", () => {
      delete process.env.SECRET_ENCRYPTION_KEY;
      expect(hasEncryptionKey()).toBe(false);
    });
    it("returns false for the wrong length", () => {
      process.env.SECRET_ENCRYPTION_KEY = "dG9vLXNob3J0";
      expect(hasEncryptionKey()).toBe(false);
    });
  });

  describe("looksLikeEnvelope", () => {
    it("detects v1 envelopes", async () => {
      const env = await encryptSecret("x");
      expect(looksLikeEnvelope(env)).toBe(true);
    });
    it("rejects plain strings", () => {
      expect(looksLikeEnvelope("plain-token")).toBe(false);
      expect(looksLikeEnvelope("")).toBe(false);
      expect(looksLikeEnvelope(null)).toBe(false);
      expect(looksLikeEnvelope(undefined)).toBe(false);
      expect(looksLikeEnvelope("v1.only-one-segment")).toBe(false);
      expect(looksLikeEnvelope("v2.aa.bb")).toBe(false);
    });
  });
});
