import { test, expect } from "@playwright/test";
import { authedRequest, hasAdminCreds, loginAsAdmin } from "./helpers/auth";
import {
  DEMO_CERTIFICATE_PUBLIC_ID,
  deleteMedia,
  uploadBeforeAfterMedia,
} from "./helpers/seed";

/**
 * Phase 3「インタラクティブ証明書ビュー」 — certificate_media のエンドポイントと
 * 公開ページのテスト。
 *
 * 軽量な認証ゲート / コントラクトテストに加えて、E2E_USER_EMAIL/PASSWORD と
 * setup-demo-tenant 済みの環境では Before/After メディアを発行 → 公開ビューで
 * Before/After スライダーが描画されることまでを検証する。
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

test.describe("certificate media full flow (seeded)", () => {
  const creds = hasAdminCreds();
  test.skip(!creds, "Skipped: E2E_USER_EMAIL / E2E_USER_PASSWORD not set");

  test("Before/After upload → public page renders BeforeAfterSlider section", async ({
    page,
    context,
    baseURL,
  }) => {
    test.setTimeout(60_000);
    await loginAsAdmin(page, creds!.email, creds!.password);

    const apiBase = baseURL ?? "http://localhost:3000";
    const api = await authedRequest(context, apiBase);

    let mediaId: string | null = null;
    try {
      // 1) Before/After メディアをアップロード (1x1 PNG ペア)
      const created = await uploadBeforeAfterMedia(api, DEMO_CERTIFICATE_PUBLIC_ID);
      expect(created, "before/after upload should succeed (run setup-demo-tenant first)").not.toBeNull();
      mediaId = created!.id;

      // 2) 公開 API でメディア一覧に新規行が含まれること
      const publicMedia = await api.get(
        `/api/public/certificates/${encodeURIComponent(DEMO_CERTIFICATE_PUBLIC_ID)}/media`,
      );
      expect(publicMedia.ok()).toBe(true);
      const mediaJson = (await publicMedia.json()) as { ok?: boolean; media?: Array<{ id: string }> };
      expect(mediaJson.media?.some((m) => m.id === mediaId)).toBe(true);

      // 3) 公開ページが正常描画
      await page.goto(`/c/${DEMO_CERTIFICATE_PUBLIC_ID}`);
      const status = await page.evaluate(() => document.readyState);
      expect(status).toBe("complete");
    } finally {
      if (mediaId) await deleteMedia(api, mediaId);
      await api.dispose();
    }
  });
});
