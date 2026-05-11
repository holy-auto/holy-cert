import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { createClientMock, createServiceRoleAdminMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  createServiceRoleAdminMock: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleAdmin: (...args: unknown[]) => createServiceRoleAdminMock(...args),
}));

import { getReadReplica, isReadReplicaConfigured, __resetReplicaClientForTest } from "@/lib/supabase/readReplica";

describe("supabase readReplica helpers", () => {
  const ORIG_ENV = { ...process.env };

  beforeEach(() => {
    createClientMock.mockReset().mockReturnValue({ __mock: "replica" });
    createServiceRoleAdminMock.mockReset().mockReturnValue({ __mock: "primary" });
    __resetReplicaClientForTest();
    delete process.env.SUPABASE_REPLICA_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proj.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  });

  afterEach(() => {
    process.env = { ...ORIG_ENV };
  });

  describe("isReadReplicaConfigured", () => {
    it("is false when SUPABASE_REPLICA_URL is unset", () => {
      expect(isReadReplicaConfigured()).toBe(false);
    });

    it("is false when SUPABASE_REPLICA_URL equals the primary URL", () => {
      process.env.SUPABASE_REPLICA_URL = "https://proj.supabase.co";
      expect(isReadReplicaConfigured()).toBe(false);
    });

    it("is false when SUPABASE_REPLICA_URL is whitespace", () => {
      process.env.SUPABASE_REPLICA_URL = "   ";
      expect(isReadReplicaConfigured()).toBe(false);
    });

    it("is true when SUPABASE_REPLICA_URL is a distinct URL", () => {
      process.env.SUPABASE_REPLICA_URL = "https://proj-replica.supabase.co";
      expect(isReadReplicaConfigured()).toBe(true);
    });
  });

  describe("getReadReplica", () => {
    it("requires a non-empty reason string", () => {
      expect(() => getReadReplica("")).toThrow(/reason/);
      expect(() => getReadReplica("   ")).toThrow(/reason/);
    });

    it("falls back to the primary admin client when replica is not configured", () => {
      const client = getReadReplica("passport public read");
      expect(client).toEqual({ __mock: "primary" });
      expect(createClientMock).not.toHaveBeenCalled();
      expect(createServiceRoleAdminMock).toHaveBeenCalledWith(expect.stringContaining("replica-fallback"));
    });

    it("constructs a replica client when SUPABASE_REPLICA_URL is set", () => {
      process.env.SUPABASE_REPLICA_URL = "https://proj-replica.supabase.co";

      const client = getReadReplica("dashboard summary");
      expect(client).toEqual({ __mock: "replica" });
      expect(createClientMock).toHaveBeenCalledWith(
        "https://proj-replica.supabase.co",
        "service-key",
        expect.objectContaining({
          auth: expect.objectContaining({ autoRefreshToken: false, persistSession: false }),
        }),
      );
    });

    it("caches the replica client across calls (singleton)", () => {
      process.env.SUPABASE_REPLICA_URL = "https://proj-replica.supabase.co";

      getReadReplica("call 1");
      getReadReplica("call 2");
      expect(createClientMock).toHaveBeenCalledTimes(1);
    });

    it("throws when replica URL is set but service role key is missing", () => {
      process.env.SUPABASE_REPLICA_URL = "https://proj-replica.supabase.co";
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      expect(() => getReadReplica("test")).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
    });
  });
});
