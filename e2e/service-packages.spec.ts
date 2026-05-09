import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

/**
 * 施工テンプレート (Canned Jobs) Phase 1 e2e 仕様。
 *
 * 1. 認証なしの guard チェック (常時実行)
 * 2. 認証ありのライフサイクル (E2E_USER_EMAIL / E2E_USER_PASSWORD 設定時のみ):
 *    - service_packages を 1 件作成
 *    - 案件 (reservation) を 1 件作成
 *    - 案件に「パッケージから適用」(/expand → reservations PUT)
 *    - reservations.menu_items_json にパッケージ品目が反映されている
 *    - 同じ車両で証明書発行画面を開いて「再展開されない」(reservation の
 *      menu_items_json は cert 作成では一切増減しない) を確認
 *
 * 認証フローは admin-portal.spec.ts と同形式。CI が secrets を持つまでは
 * skip され、ローカル / staging で手動実行する。
 */

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

// ─── 1. 認証なし ──────────────────────────────────────────────────────────────

test.describe("service-packages — unauthenticated", () => {
  test("/admin/service-packages redirects to login", async ({ page }) => {
    await page.goto("/admin/service-packages");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("GET /api/admin/service-packages returns 401", async ({ request }) => {
    const res = await request.get("/api/admin/service-packages");
    expect([401, 403]).toContain(res.status());
  });

  test("POST /api/admin/service-packages returns 401", async ({ request }) => {
    const res = await request.post("/api/admin/service-packages", {
      data: { name: "x" },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("POST /api/admin/service-packages/:id/expand returns 401", async ({ request }) => {
    const res = await request.post("/api/admin/service-packages/00000000-0000-0000-0000-000000000000/expand");
    expect([401, 403, 404]).toContain(res.status());
  });

  test("GET /api/admin/menu-items/:id/packages returns 401", async ({ request }) => {
    const res = await request.get("/api/admin/menu-items/00000000-0000-0000-0000-000000000000/packages");
    expect([401, 403]).toContain(res.status());
  });
});

// ─── 2. 認証あり (lifecycle) ────────────────────────────────────────────────

test.describe("service-packages — authenticated lifecycle", () => {
  test.skip(!email || !password, "Skipped: E2E_USER_EMAIL / E2E_USER_PASSWORD not set");

  /** ログインしてセッションクッキーを確立する */
  async function login(page: Page) {
    await page.goto("/login");
    await page.locator('input[name="email"]').fill(email!);
    await page.locator('input[name="password"]').fill(password!);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });
  }

  /** 既存品目から 1 件取得 (なければスキップ) */
  async function ensureMenuItem(req: APIRequestContext): Promise<{ id: string; name: string } | null> {
    const res = await req.get("/api/admin/menu-items");
    if (!res.ok()) return null;
    const j = (await res.json()) as { items?: Array<{ id: string; name: string; is_active: boolean }> };
    const found = (j.items ?? []).find((it) => it.is_active);
    return found ? { id: found.id, name: found.name } : null;
  }

  test("UI surfaces: list page, menu-items reverse lookup toggle, cert picker", async ({ page }) => {
    await login(page);

    await page.goto("/admin/service-packages");
    await expect(page.getByText(/施工パッケージ/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/新規パッケージ/)).toBeVisible();

    await page.goto("/admin/menu-items");
    // 逆引きトグルは品目が 1 件以上あれば表示される
    const toggles = page.locator("[data-testid^='menu-item-packages-toggle-']");
    if ((await toggles.count()) > 0) {
      await toggles.first().click();
      // SWR fetch 完了を待つ
      await page.waitForResponse((r) => r.url().includes("/packages") && r.request().method() === "GET", {
        timeout: 5000,
      });
    }

    await page.goto("/admin/certificates/new");
    await expect(page.locator("[data-testid='cert-pick-package-trigger']")).toBeVisible({ timeout: 10000 });
  });

  test("create package → apply to job → menu_items_json populated → cert does NOT re-expand", async ({
    page,
    request,
  }) => {
    await login(page);

    const menu = await ensureMenuItem(request);
    test.skip(!menu, "tenant has no active menu_items; cannot exercise lifecycle");

    // 1) パッケージを 1 件作成
    const pkgName = `e2e-pkg-${Date.now()}`;
    const createRes = await request.post("/api/admin/service-packages", {
      data: {
        name: pkgName,
        category: "coating",
        price_strategy: "sum_of_items",
        items: [{ menu_item_id: menu!.id, quantity: 2 }],
      },
    });
    expect(createRes.ok(), `package create failed: ${await createRes.text()}`).toBe(true);
    const createJson = (await createRes.json()) as { package?: { id: string } };
    const pkgId = createJson.package?.id;
    expect(pkgId).toBeTruthy();

    // 2) 案件を 1 件作成 (空の menu_items_json でスタート)
    const today = new Date().toISOString().slice(0, 10);
    const resvRes = await request.post("/api/admin/reservations", {
      data: {
        title: `e2e-job-${Date.now()}`,
        scheduled_date: today,
        menu_items_json: [],
      },
    });
    if (!resvRes.ok()) {
      // billing/plan ガードで弾かれるテナントもありうるので skip 扱い
      test.skip(true, `reservation create not allowed: ${await resvRes.text()}`);
    }
    const resvJson = (await resvRes.json()) as { reservation?: { id: string }; ok?: boolean };
    const reservationId = resvJson.reservation?.id;
    expect(reservationId).toBeTruthy();

    // 3) /expand を呼んでスナップショットを取得
    const expandRes = await request.post(`/api/admin/service-packages/${pkgId}/expand`);
    expect(expandRes.ok(), `expand failed: ${await expandRes.text()}`).toBe(true);
    const expanded = (await expandRes.json()) as {
      items: Array<{ menu_item_id: string; name: string; line_total: number }>;
      items_total: number;
      price: number | null;
    };
    expect(expanded.items.length).toBeGreaterThan(0);

    // 4) reservations PUT で menu_items_json に append
    const merged = expanded.items.map((it) => ({
      menu_item_id: it.menu_item_id,
      name: it.name,
      price: it.line_total,
    }));
    const applyRes = await request.put("/api/admin/reservations", {
      data: { id: reservationId, menu_items_json: merged },
    });
    expect(applyRes.ok(), `reservation apply failed: ${await applyRes.text()}`).toBe(true);

    // 5) reservation を再取得して menu_items_json を確認
    const fetchAfterApply = await request.get(`/api/admin/reservations?id=${reservationId}`);
    if (fetchAfterApply.ok()) {
      const j = (await fetchAfterApply.json()) as {
        reservations?: Array<{ id: string; menu_items_json: unknown[] }>;
      };
      const target = j.reservations?.find((r) => r.id === reservationId);
      if (target) {
        expect(Array.isArray(target.menu_items_json)).toBe(true);
        expect((target.menu_items_json as unknown[]).length).toBe(merged.length);
      }
    }

    // 6) 証明書発行画面に遷移しただけでは menu_items_json は変わらない
    await page.goto("/admin/certificates/new");
    await expect(page.locator("[data-testid='cert-pick-package-trigger']")).toBeVisible({ timeout: 10000 });

    const fetchAfterCertView = await request.get(`/api/admin/reservations?id=${reservationId}`);
    if (fetchAfterCertView.ok()) {
      const j2 = (await fetchAfterCertView.json()) as {
        reservations?: Array<{ id: string; menu_items_json: unknown[] }>;
      };
      const target2 = j2.reservations?.find((r) => r.id === reservationId);
      if (target2) {
        expect((target2.menu_items_json as unknown[]).length).toBe(merged.length);
      }
    }

    // 7) クリーンアップ — パッケージはアーカイブする (案件は残しておいても害はない)
    await request.delete(`/api/admin/service-packages/${pkgId}`);
  });
});
