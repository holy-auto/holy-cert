import { describe, expect, it, beforeAll } from "vitest";
import { buildTokenWritePayload, isTokenExpiringSoon, readTokensFromRow } from "../tokenStore";

beforeAll(() => {
  // 32 byte 鍵を base64 で設定 (テスト用)
  const key = Buffer.alloc(32, 0x42).toString("base64");
  process.env.SECRET_ENCRYPTION_KEY = key;
});

describe("isTokenExpiringSoon", () => {
  it("5 分後に切れるトークンは更新が必要と判定", () => {
    const expires = new Date(Date.now() + 4 * 60 * 1000);
    expect(isTokenExpiringSoon(expires)).toBe(true);
  });
  it("10 分後に切れるトークンはまだ有効", () => {
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    expect(isTokenExpiringSoon(expires)).toBe(false);
  });
  it("既に切れているトークンも更新対象", () => {
    const expires = new Date(Date.now() - 60_000);
    expect(isTokenExpiringSoon(expires)).toBe(true);
  });
});

describe("buildTokenWritePayload + readTokensFromRow ラウンドトリップ", () => {
  it("暗号化したトークンを復号して同じ平文を取り戻せる", async () => {
    const original = {
      accessToken: "freee_access_xyz",
      refreshToken: "freee_refresh_abc",
      expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
    };
    const written = await buildTokenWritePayload(original);
    expect(written.access_token_ciphertext).not.toBeNull();
    expect(written.refresh_token_ciphertext).not.toBeNull();
    expect(written.access_token_ciphertext).not.toBe(original.accessToken);

    const restored = await readTokensFromRow(
      {
        access_token_ciphertext: written.access_token_ciphertext,
        refresh_token_ciphertext: written.refresh_token_ciphertext,
        token_expires_at: written.token_expires_at,
      },
      "freee",
    );
    expect(restored?.accessToken).toBe(original.accessToken);
    expect(restored?.refreshToken).toBe(original.refreshToken);
  });

  it("ciphertext が NULL なら null を返す", async () => {
    const restored = await readTokensFromRow(
      {
        access_token_ciphertext: null,
        refresh_token_ciphertext: null,
        token_expires_at: null,
      },
      "freee",
    );
    expect(restored).toBeNull();
  });
});
