import { describe, it, expect, vi, beforeEach } from "vitest";

const { setUserMock, setTagMock, setContextMock } = vi.hoisted(() => ({
  setUserMock: vi.fn(),
  setTagMock: vi.fn(),
  setContextMock: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  setUser: setUserMock,
  setTag: setTagMock,
  setContext: setContextMock,
}));

import { setSentryUserAndTenant, setSentryInsurerContext } from "@/lib/sentryContext";

describe("sentryContext", () => {
  beforeEach(() => {
    setUserMock.mockClear();
    setTagMock.mockClear();
    setContextMock.mockClear();
  });

  it("sets user.id (id only — never email) and tenant tag/context", () => {
    setSentryUserAndTenant({
      userId: "user-1",
      tenantId: "tenant-1",
      role: "owner",
      planTier: "starter",
    });

    expect(setUserMock).toHaveBeenCalledWith({ id: "user-1" });
    // No email/ip leaked into Sentry
    const userArg = setUserMock.mock.calls[0][0];
    expect(userArg).not.toHaveProperty("email");
    expect(userArg).not.toHaveProperty("ip_address");

    expect(setTagMock).toHaveBeenCalledWith("tenant_id", "tenant-1");
    expect(setTagMock).toHaveBeenCalledWith("role", "owner");
    expect(setTagMock).toHaveBeenCalledWith("plan_tier", "starter");
    expect(setContextMock).toHaveBeenCalledWith("tenant", {
      tenant_id: "tenant-1",
      role: "owner",
      plan_tier: "starter",
    });
  });

  it("omits role/plan_tier tags when not provided", () => {
    setSentryUserAndTenant({ userId: "u", tenantId: "t" });

    const tagKeys = setTagMock.mock.calls.map((c) => c[0]);
    expect(tagKeys).toContain("tenant_id");
    expect(tagKeys).not.toContain("role");
    expect(tagKeys).not.toContain("plan_tier");
  });

  it("scopes insurer caller separately from tenant caller", () => {
    setSentryInsurerContext({ userId: "u", insurerId: "ins-1" });

    expect(setUserMock).toHaveBeenCalledWith({ id: "u" });
    expect(setTagMock).toHaveBeenCalledWith("insurer_id", "ins-1");
    expect(setContextMock).toHaveBeenCalledWith("insurer", { insurer_id: "ins-1" });
  });
});
