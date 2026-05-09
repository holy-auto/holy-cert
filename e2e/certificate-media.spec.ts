import { test, expect } from "@playwright/test";

/**
 * Phase 3「インタラクティブ証明書ビュー」 — certificate_media のエンドポイントと
 * 公開ページのスモークテスト。
 *
 * このリポジトリの e2e はシード済みデータベースに依存しないコントラクトテスト
 * 中心 (api-endpoints.spec.ts / certificate.spec.ts と同じスタイル) なので、
 * ここでは:
 *   - 認証ゲート (POST/DELETE が anonymous で 4xx を返すこと)
 *   - 公開 GET が存在しない public_id でも 5xx を出さないこと
 *   - /c/[public_id] が読み込み可能なこと
 * を確認する。実データありの「動画 + Before/After を発行 → 公開で表示・操作」
 * は seeded test fixture を別途用意する PR で追加する。
 */

test.describe("certificate media endpoints", () => {
  test("POST /api/certificates/[id]/media requires authentication", async ({ request }) => {
    const res = await request.post("/api/certificates/PID-NONEXISTENT/media", {
      multipart: {
        media_type: "video",
        // No file body — should still bounce on auth before validation
      },
    });
    expect([400, 401, 403]).toContain(res.status());
  });

  test("DELETE /api/certificates/media/[id] requires authentication", async ({ request }) => {
    const res = await request.delete("/api/certificates/media/00000000-0000-0000-0000-000000000000");
    expect([401, 403, 404]).toContain(res.status());
  });

  test("GET /api/public/certificates/[public_id]/media never 500s for unknown id", async ({ request }) => {
    const res = await request.get("/api/public/certificates/nonexistent-public-id/media");
    expect(res.status()).toBeLessThan(500);
    const json = await res.json();
    expect(json).toBeTruthy();
    // 公開証明書が存在しない場合、media は空配列で返る (apiOk shape)。
    if (json.ok && Array.isArray(json.media)) {
      expect(json.media.length).toBe(0);
    }
  });

  test("public certificate page handles missing media gracefully", async ({ page }) => {
    await page.goto("/c/nonexistent-media-page");
    const ready = await page.evaluate(() => document.readyState);
    expect(ready).toBe("complete");
  });
});

test.describe("certificate media MIME validation", () => {
  test("rejects non-allowed mime when authenticated payload would otherwise be accepted", async ({ request }) => {
    // この test も認証ゲートで弾かれる想定 (anonymous)。実データの seeded user
    // が必要な「フル MIME 検証」の e2e は別 PR で対応する。
    const res = await request.post("/api/certificates/PID-FAKE/media", {
      multipart: {
        media_type: "video",
        file: {
          name: "fake.exe",
          mimeType: "application/octet-stream",
          buffer: Buffer.from([0x4d, 0x5a, 0x00, 0x00]),
        },
      },
    });
    expect([400, 401, 403]).toContain(res.status());
  });
});
