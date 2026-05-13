// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToString } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`__REDIRECT__:${url}`);
  }),
  getUser: vi.fn(),
  membershipMaybeSingle: vi.fn(),
  isAddonEnabled: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mocks.getUser },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn(() => ({
            maybeSingle: mocks.membershipMaybeSingle,
          })),
        })),
      })),
    })),
  })),
}));

vi.mock("@/lib/billing/addons", () => ({
  isAddonEnabled: (...args: unknown[]) => mocks.isAddonEnabled(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createTenantScopedAdmin: vi.fn(() => ({ admin: { __mock: true } })),
}));

import { requireAddonOrGateView } from "../addonGuard";

describe("requireAddonOrGateView", () => {
  beforeEach(() => {
    mocks.redirect.mockClear();
    mocks.getUser.mockReset();
    mocks.membershipMaybeSingle.mockReset();
    mocks.isAddonEnabled.mockReset();
  });

  it("redirects to /login when no auth user", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    await expect(
      requireAddonOrGateView("market_vehicles", { feature: "中古車マーケット", href: "/admin/market-vehicles" }),
    ).rejects.toThrow("__REDIRECT__:/login?next=%2Fadmin%2Fmarket-vehicles");
  });

  it("redirects to /login when membership is missing (no tenant context)", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mocks.membershipMaybeSingle.mockResolvedValue({ data: null });
    await expect(requireAddonOrGateView("btob", { feature: "BtoB", href: "/admin/btob" })).rejects.toThrow(
      "__REDIRECT__:/login?next=%2Fadmin%2Fbtob",
    );
  });

  it("returns null when the add-on is enabled (pass-through)", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mocks.membershipMaybeSingle.mockResolvedValue({ data: { tenant_id: "t1" } });
    mocks.isAddonEnabled.mockResolvedValue(true);
    const result = await requireAddonOrGateView("deals", { feature: "Deals", href: "/admin/deals" });
    expect(result).toBeNull();
    expect(mocks.isAddonEnabled).toHaveBeenCalledWith({ __mock: true }, "t1", "deals");
  });

  it("returns a gate JSX element when the add-on is disabled", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mocks.membershipMaybeSingle.mockResolvedValue({ data: { tenant_id: "t1" } });
    mocks.isAddonEnabled.mockResolvedValue(false);
    const result = await requireAddonOrGateView("market_vehicles", {
      feature: "中古車マーケット",
      href: "/admin/market-vehicles",
    });
    expect(result).not.toBeNull();
    // SSR splits adjacent text nodes with <!-- --> separators, so we
    // strip those before substring-matching the heading copy.
    const html = renderToString(result!).replace(/<!--.*?-->/g, "");
    expect(html).toContain("中古車マーケット は別途契約が必要です");
    expect(html).toContain("ダッシュボードに戻る");
    expect(html).toContain("アドオンを申請する");
  });
});
