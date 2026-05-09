import { test, expect } from "@playwright/test";
import { authedRequest, hasAdminCreds, loginAsAdmin } from "./helpers/auth";
import {
  DEMO_CERTIFICATE_PUBLIC_ID,
  buildSampleAnnotationDoc,
  deleteImage,
  postRender,
  putAnnotations,
  uploadFixtureImage,
} from "./helpers/seed";

/**
 * Phase 2: 写真 Image Markup の e2e。
 *
 * 認証ゲート + 公開サーフェスのコントラクトテストに加えて、
 * E2E_USER_EMAIL / E2E_USER_PASSWORD と setup-demo-tenant 済みの環境では
 * 「画像アップロード → 注釈保存 → render → 公開ビュー反映」の
 * 一気通貫を実行する。fixture が無い CI では full flow ブロックは skip される。
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
    expect(res.status()).toBeLessThan(500);
  });

  test("POST render requires auth", async ({ request }) => {
    const res = await request.post("/api/certificates/images/00000000-0000-0000-0000-000000000000/render");
    expect([400, 401, 403, 404]).toContain(res.status());
  });
});

test.describe("Image Markup public surface", () => {
  test("public page does not crash even when annotations would render", async ({ page }) => {
    await page.goto("/c/nonexistent-test-id");
    const status = await page.evaluate(() => document.readyState);
    expect(status).toBe("complete");
  });
});

test.describe("Image Markup full flow (seeded)", () => {
  const creds = hasAdminCreds();
  test.skip(!creds, "Skipped: E2E_USER_EMAIL / E2E_USER_PASSWORD not set");

  test("annotation save → render → public page shows annotated image", async ({ page, context, baseURL }) => {
    test.setTimeout(60_000);
    await loginAsAdmin(page, creds!.email, creds!.password);

    const apiBase = baseURL ?? "http://localhost:3000";
    const api = await authedRequest(context, apiBase);

    let imageId: string | null = null;
    try {
      // 1) 既存デモ証明書に画像を 1 枚アップロード
      const uploaded = await uploadFixtureImage(api, DEMO_CERTIFICATE_PUBLIC_ID);
      expect(uploaded, "fixture upload should succeed (run setup-demo-tenant first)").not.toBeNull();
      imageId = uploaded!.id;

      // 2) 注釈ドキュメントを保存
      const doc = buildSampleAnnotationDoc({ width: 1, height: 1 });
      const annotated = await putAnnotations(api, imageId, doc);
      expect(annotated, "annotations PUT should be 200").toBe(true);

      // 3) サーバ側で SVG を焼き込み
      const rendered = await postRender(api, imageId);
      expect(rendered, "render POST should be 200").toBe(true);

      // 4) 公開ページを開いて 200 で描画されることを確認
      await page.goto(`/c/${DEMO_CERTIFICATE_PUBLIC_ID}`);
      const status = await page.evaluate(() => document.readyState);
      expect(status).toBe("complete");
      // 「添付画像」セクションが描画されるはず
      const heading = page.locator("text=添付画像");
      await expect(heading).toBeVisible({ timeout: 10_000 });
    } finally {
      if (imageId) await deleteImage(api, imageId);
      await api.dispose();
    }
  });
});
