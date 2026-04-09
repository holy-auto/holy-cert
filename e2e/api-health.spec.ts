import { test, expect } from "@playwright/test";

test.describe("Health endpoint", () => {
  test("GET /api/health returns status with checks", async ({ request }) => {
    const res = await request.get("/api/health");
    // healthy (200) または設定不足による degraded (503) を許容
    expect([200, 503]).toContain(res.status());
    const json = await res.json();
    expect(json.status).toBeDefined();
    expect(["healthy", "degraded"]).toContain(json.status);
    expect(json.timestamp).toBeDefined();
    expect(json.checks).toBeDefined();
    expect(json.checks.database).toBeDefined();
    expect(json.checks.env_vars).toBeDefined();
  });
});

test.describe("Contact form validation", () => {
  test("contact API accepts valid submission", async ({ request }) => {
    const res = await request.post("/api/contact", {
      data: {
        name: "テスト太郎",
        email: "test@example.com",
        company: "テスト株式会社",
        category: "サービスについて",
        message: "テストメッセージです。",
      },
    });
    // Should succeed (200) or be rate limited (429) in CI
    expect([200, 429]).toContain(res.status());
    if (res.status() === 200) {
      const json = await res.json();
      expect(json.ok).toBe(true);
    }
  });
});

test.describe("API health checks", () => {
  test("contact API rejects invalid body", async ({ request }) => {
    const res = await request.post("/api/contact", {
      data: { name: "" }, // missing required fields
    });
    expect(res.status()).toBe(400);
  });

  test("contact API rejects empty JSON", async ({ request }) => {
    const res = await request.post("/api/contact", {
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  test("join API rejects weak password", async ({ request }) => {
    const res = await request.post("/api/join", {
      data: {
        company_name: "Test Co",
        contact_person: "Test Person",
        email: "test@example.com",
        password: "weak", // too short
      },
    });
    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("validation_error");
  });

  test("join API rejects missing fields", async ({ request }) => {
    const res = await request.post("/api/join", {
      data: {
        password: "StrongPass1",
        // missing company_name, contact_person, email
      },
    });
    expect(res.status()).toBe(400);
  });

  test("admin API returns 401 without auth", async ({ request }) => {
    const res = await request.get("/api/admin/customers");
    expect(res.status()).toBe(401);
  });

  test("CSRF protection blocks cross-origin POST", async ({ request }) => {
    const res = await request.post("/api/contact", {
      data: { name: "test" },
      headers: {
        origin: "https://evil.com",
        host: "localhost:3000",
      },
    });
    // Should be blocked by CSRF middleware
    expect([400, 403]).toContain(res.status());
  });
});
