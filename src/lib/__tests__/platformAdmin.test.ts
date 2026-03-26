import { describe, it, expect, vi, beforeEach } from "vitest";
import { isPlatformTenantId, isPlatformAdmin } from "@/lib/auth/platformAdmin";
import type { CallerInfo } from "@/lib/auth/checkRole";

const PLATFORM_ID = "platform-tenant-001";
const OTHER_ID = "other-tenant-999";

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("PLATFORM_TENANT_ID", PLATFORM_ID);
});

describe("isPlatformTenantId", () => {
  it("returns true when tenantId matches PLATFORM_TENANT_ID", () => {
    expect(isPlatformTenantId(PLATFORM_ID)).toBe(true);
  });

  it("returns false when tenantId does not match", () => {
    expect(isPlatformTenantId(OTHER_ID)).toBe(false);
  });

  it("returns false when PLATFORM_TENANT_ID is not set", () => {
    vi.stubEnv("PLATFORM_TENANT_ID", "");
    expect(isPlatformTenantId(PLATFORM_ID)).toBe(false);
  });

  it("returns false for empty string tenantId", () => {
    expect(isPlatformTenantId("")).toBe(false);
  });
});

describe("isPlatformAdmin", () => {
  function makeCaller(tenantId: string, role: string): CallerInfo {
    return {
      userId: "user-123",
      tenantId,
      role: role as CallerInfo["role"],
    };
  }

  it("returns true for platform tenant owner", () => {
    expect(isPlatformAdmin(makeCaller(PLATFORM_ID, "owner"))).toBe(true);
  });

  it("returns true for platform tenant admin", () => {
    expect(isPlatformAdmin(makeCaller(PLATFORM_ID, "admin"))).toBe(true);
  });

  it("returns false for platform tenant staff", () => {
    expect(isPlatformAdmin(makeCaller(PLATFORM_ID, "staff"))).toBe(false);
  });

  it("returns false for platform tenant viewer", () => {
    expect(isPlatformAdmin(makeCaller(PLATFORM_ID, "viewer"))).toBe(false);
  });

  it("returns false for non-platform tenant owner", () => {
    expect(isPlatformAdmin(makeCaller(OTHER_ID, "owner"))).toBe(false);
  });

  it("returns false for non-platform tenant admin", () => {
    expect(isPlatformAdmin(makeCaller(OTHER_ID, "admin"))).toBe(false);
  });
});
