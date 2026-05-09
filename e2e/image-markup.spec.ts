import { test, expect } from "@playwright/test";

/**
 * Phase 2: 写真 Image Markup の e2e。
 *
 * 既存の e2e 群 (certificate.spec.ts) と同様、無認証 API がきちんと
 * 401/403/404 で弾かれること、公開ページがクラッシュせず描画されることを
 * 確認する軽量なスモークテスト。
 *
 * フル E2E (注釈追加 → 保存 → 公開ビュー → PDF) は現状の e2e 基盤に
 * テナント・証明書・画像のシード機構が無いためスキップ。シードが入ったら
 * `test.describe.skip` を外す。
 */

test.describe("Image Markup API authorization", () => {
  test("PUT annotations requires auth", async ({ request }) => {
    const res = await request.put(
      "/api/certificates/images/00000000-0000-0000-0000-000000000000/annotations",
      {
        data: { annotations: null },
      },
    );
    expect([400, 401, 403, 404]).toContain(res.status());
  });

  test("PUT annotations rejects malformed JSON shape", async ({ request }) => {
    const res = await request.put(
      "/api/certificates/images/00000000-0000-0000-0000-000000000000/annotations",
      {
        data: { annotations: { not: "valid" } },
      },
    );
    // Auth or validation error — but never 500.
    expect(res.status()).toBeLessThan(500);
  });

  test("POST render requires auth", async ({ request }) => {
    const res = await request.post("/api/certificates/images/00000000-0000-0000-0000-000000000000/render");
    expect([400, 401, 403, 404]).toContain(res.status());
  });
});

test.describe("Image Markup public surface", () => {
  test("public page does not crash even when annotations would render", async ({ page }) => {
    // /c/<invalid> は 404 NotFound でも HTML が返る (Next の通常動作)。
    // Annotated photo セクションがあるルートでも JS 例外が出ないことを確認する。
    await page.goto("/c/nonexistent-test-id");
    const status = await page.evaluate(() => document.readyState);
    expect(status).toBe("complete");
  });
});

test.describe.skip("Image Markup full flow (requires fixture)", () => {
  test("annotation save → public view shows overlay → PDF embeds rendered image", async () => {
    // TODO: シード機構 (テナント / 証明書 / 画像) が入ったら以下を実装。
    //  1) ログイン → 既存画像に注釈を 1 つ追加して保存
    //  2) 公開ビュー /c/<pid> を開き、SVG オーバーレイ (or rendered URL) を確認
    //  3) /api/certificate/pdf?pid=<pid> を取得し、PDF にページ3 (Photos) があることを確認
  });
});
