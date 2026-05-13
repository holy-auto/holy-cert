import { describe, it, expect, vi } from "vitest";
import { isPolygonAnchorOptedOut } from "../tenantOptOut";

type TenantsRow = { polygon_anchor_opt_out: boolean | null } | null;
type DbResult = { data: TenantsRow; error: unknown | null };

function makeSupabase(result: DbResult) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { client: { from }, from, select, eq, maybeSingle };
}

describe("isPolygonAnchorOptedOut", () => {
  it("returns true when tenantId is empty (no context = don't anchor)", async () => {
    const sb = makeSupabase({ data: { polygon_anchor_opt_out: false }, error: null });
    expect(await isPolygonAnchorOptedOut(sb.client, "")).toBe(true);
    expect(sb.from).not.toHaveBeenCalled();
  });

  it("returns false when row exists with opt_out=false (default ON path)", async () => {
    const sb = makeSupabase({ data: { polygon_anchor_opt_out: false }, error: null });
    expect(await isPolygonAnchorOptedOut(sb.client, "tenant-1")).toBe(false);
    expect(sb.from).toHaveBeenCalledWith("tenants");
    expect(sb.select).toHaveBeenCalledWith("polygon_anchor_opt_out");
    expect(sb.eq).toHaveBeenCalledWith("id", "tenant-1");
  });

  it("returns true when row exists with opt_out=true (tenant veto)", async () => {
    const sb = makeSupabase({ data: { polygon_anchor_opt_out: true }, error: null });
    expect(await isPolygonAnchorOptedOut(sb.client, "tenant-2")).toBe(true);
  });

  it("returns false when opt_out is null (treated as default false → anchor)", async () => {
    const sb = makeSupabase({ data: { polygon_anchor_opt_out: null }, error: null });
    expect(await isPolygonAnchorOptedOut(sb.client, "tenant-3")).toBe(false);
  });

  it("fails closed when row is missing (returns true)", async () => {
    const sb = makeSupabase({ data: null, error: null });
    expect(await isPolygonAnchorOptedOut(sb.client, "tenant-missing")).toBe(true);
  });

  it("fails closed when DB returns an error", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const sb = makeSupabase({ data: null, error: { message: "rls denied" } });
    expect(await isPolygonAnchorOptedOut(sb.client, "tenant-x")).toBe(true);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("fails closed when query throws", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const client = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => {
              throw new Error("network down");
            },
          }),
        }),
      }),
    };
    expect(await isPolygonAnchorOptedOut(client, "tenant-y")).toBe(true);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
