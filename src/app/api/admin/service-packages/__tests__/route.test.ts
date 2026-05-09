/* eslint-disable @typescript-eslint/no-explicit-any */
// Test file uses a polymorphic supabase query-builder mock; the chained
// shape demands `any` in a few helper signatures. Errors stay strict-typed.

import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveCallerWithRole: vi.fn(),
  createTenantScopedAdmin: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn().mockResolvedValue({}) }));
vi.mock("@/lib/auth/checkRole", () => ({
  resolveCallerWithRole: mocks.resolveCallerWithRole,
  requireMinRole: (caller: { role: string }, minRole: string) => {
    const rank: Record<string, number> = { super_admin: 5, owner: 4, admin: 3, staff: 2, viewer: 1 };
    return (rank[caller.role] ?? 0) >= (rank[minRole] ?? 0);
  },
}));
vi.mock("@/lib/supabase/admin", () => ({ createTenantScopedAdmin: mocks.createTenantScopedAdmin }));
vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: () => ({}) },
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { GET, POST } from "@/app/api/admin/service-packages/route";
import { GET as expandGET } from "@/app/api/admin/service-packages/[id]/expand/route";
import { GET as detailGET, DELETE as detailDELETE } from "@/app/api/admin/service-packages/[id]/route";

const TENANT_A = "11111111-1111-1111-1111-111111111111";
const TENANT_B = "22222222-2222-2222-2222-222222222222";
const ADMIN_A = { userId: "u1", tenantId: TENANT_A, role: "admin", planTier: "pro" };
const VIEWER_A = { userId: "u2", tenantId: TENANT_A, role: "viewer", planTier: "pro" };

beforeEach(() => {
  Object.values(mocks).forEach((m) => "mockReset" in m && m.mockReset());
});

/**
 * Build a mock supabase admin client whose `.from(table)` returns a
 * fluent query builder. The builder records the `.eq("tenant_id", X)` chain
 * so we can verify the API layer always scopes by tenantId.
 */
function buildAdmin(opts: {
  tables: Record<
    string,
    {
      onSelect?: (filters: Record<string, unknown>) => { data: unknown[] | unknown; error: unknown };
      onInsert?: (rows: unknown) => { data: unknown; error: unknown };
      onUpdate?: (
        patch: Record<string, unknown>,
        filters: Record<string, unknown>,
      ) => { data: unknown; error: unknown };
      onDelete?: (filters: Record<string, unknown>) => { data: unknown; error: unknown };
    }
  >;
  recordFilters?: { table: string; filters: Record<string, unknown> }[];
}) {
  const recordFilters = opts.recordFilters ?? [];
  return {
    from(table: string) {
      const tableHandlers = opts.tables[table];
      const filters: Record<string, unknown> = {};
      const builder: any = {
        select() {
          return builder;
        },
        eq(col: string, val: unknown) {
          filters[col] = val;
          return builder;
        },
        in(col: string, vals: unknown[]) {
          filters[`${col}__in`] = vals;
          return builder;
        },
        order() {
          return builder;
        },
        async maybeSingle() {
          recordFilters.push({ table, filters: { ...filters } });
          const r = tableHandlers?.onSelect?.(filters) ?? { data: null, error: null };
          const data = Array.isArray(r.data) ? (r.data[0] ?? null) : r.data;
          return { data, error: r.error };
        },
        async single() {
          recordFilters.push({ table, filters: { ...filters } });
          const r = tableHandlers?.onSelect?.(filters) ?? { data: null, error: null };
          const data = Array.isArray(r.data) ? (r.data[0] ?? null) : r.data;
          return { data, error: r.error };
        },
        // terminal: makes the chain awaitable and trigger select handler
        then(resolve: (v: any) => any, reject?: (e: any) => any) {
          try {
            recordFilters.push({ table, filters: { ...filters } });
            const r = tableHandlers?.onSelect?.(filters) ?? { data: [], error: null };
            return Promise.resolve(r).then(resolve, reject);
          } catch (e) {
            return reject ? reject(e) : Promise.reject(e);
          }
        },
        insert(rows: unknown) {
          const insertBuilder: any = {
            select() {
              return insertBuilder;
            },
            async single() {
              recordFilters.push({ table, filters: { ...filters, __op: "insert" } });
              const r = tableHandlers?.onInsert?.(rows) ?? { data: null, error: null };
              return { data: r.data, error: r.error };
            },
            then(resolve: (v: any) => any, reject?: (e: any) => any) {
              try {
                recordFilters.push({ table, filters: { ...filters, __op: "insert" } });
                const r = tableHandlers?.onInsert?.(rows) ?? { data: null, error: null };
                return Promise.resolve(r).then(resolve, reject);
              } catch (e) {
                return reject ? reject(e) : Promise.reject(e);
              }
            },
          };
          return insertBuilder;
        },
        update(patch: Record<string, unknown>) {
          const updBuilder: any = {
            eq(col: string, val: unknown) {
              filters[col] = val;
              return updBuilder;
            },
            then(resolve: (v: any) => any, reject?: (e: any) => any) {
              try {
                recordFilters.push({ table, filters: { ...filters, __op: "update" } });
                const r = tableHandlers?.onUpdate?.(patch, { ...filters }) ?? { data: null, error: null };
                return Promise.resolve(r).then(resolve, reject);
              } catch (e) {
                return reject ? reject(e) : Promise.reject(e);
              }
            },
          };
          return updBuilder;
        },
        delete() {
          const delBuilder: any = {
            eq(col: string, val: unknown) {
              filters[col] = val;
              return delBuilder;
            },
            then(resolve: (v: any) => any, reject?: (e: any) => any) {
              try {
                recordFilters.push({ table, filters: { ...filters, __op: "delete" } });
                const r = tableHandlers?.onDelete?.({ ...filters }) ?? { data: null, error: null };
                return Promise.resolve(r).then(resolve, reject);
              } catch (e) {
                return reject ? reject(e) : Promise.reject(e);
              }
            },
          };
          return delBuilder;
        },
      };
      return builder;
    },
  } as any;
}

function makeReq(url: string, init?: RequestInit) {
  return new Request(url, init) as any;
}

describe("GET /api/admin/service-packages", () => {
  it("401 when not authenticated", async () => {
    mocks.resolveCallerWithRole.mockResolvedValueOnce(null);
    const res = await GET(makeReq("http://localhost/api/admin/service-packages"));
    expect(res.status).toBe(401);
  });

  it("scopes the query by tenant_id and excludes archived by default", async () => {
    mocks.resolveCallerWithRole.mockResolvedValueOnce(ADMIN_A);
    const recordFilters: { table: string; filters: Record<string, unknown> }[] = [];
    mocks.createTenantScopedAdmin.mockReturnValueOnce({
      admin: buildAdmin({
        tables: {
          service_packages: {
            onSelect: (filters) => ({
              data: [
                {
                  id: "p1",
                  name: "Lv2 標準",
                  description: null,
                  category: "coating",
                  price_strategy: "sum_of_items",
                  fixed_price: null,
                  recommended_template_id: null,
                  sort_order: 0,
                  is_archived: filters["is_archived"] ?? false,
                  created_at: "now",
                  updated_at: "now",
                },
              ],
              error: null,
            }),
          },
          service_package_items: {
            onSelect: () => ({ data: [{ package_id: "p1" }, { package_id: "p1" }], error: null }),
          },
        },
        recordFilters,
      }),
    });

    const res = await GET(makeReq("http://localhost/api/admin/service-packages"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { packages: Array<{ id: string; item_count: number }> };
    expect(body.packages[0]).toMatchObject({ id: "p1", item_count: 2 });
    // tenant_id でフィルタされていること
    const pkgFilter = recordFilters.find((f) => f.table === "service_packages");
    expect(pkgFilter?.filters["tenant_id"]).toBe(TENANT_A);
    expect(pkgFilter?.filters["is_archived"]).toBe(false);
  });
});

describe("POST /api/admin/service-packages", () => {
  it("403 when caller role is below staff", async () => {
    mocks.resolveCallerWithRole.mockResolvedValueOnce(VIEWER_A);
    const res = await POST(
      makeReq("http://localhost/api/admin/service-packages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "x", items: [] }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("rejects payload referencing menu_item_id from another tenant", async () => {
    mocks.resolveCallerWithRole.mockResolvedValueOnce(ADMIN_A);
    mocks.createTenantScopedAdmin.mockReturnValueOnce({
      admin: buildAdmin({
        tables: {
          // tenant A の menu_items を引いた結果、cross-tenant ID は出てこない
          menu_items: { onSelect: () => ({ data: [], error: null }) },
        },
      }),
    });

    const res = await POST(
      makeReq("http://localhost/api/admin/service-packages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "x",
          items: [{ menu_item_id: "33333333-3333-43d3-a333-333333333333", quantity: 1 }],
        }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("inserts package and items scoped by tenant_id", async () => {
    mocks.resolveCallerWithRole.mockResolvedValueOnce(ADMIN_A);
    const recordFilters: { table: string; filters: Record<string, unknown> }[] = [];
    const insertedRows: unknown[] = [];

    mocks.createTenantScopedAdmin.mockReturnValueOnce({
      admin: buildAdmin({
        tables: {
          menu_items: { onSelect: () => ({ data: [{ id: "44444444-4444-44d3-a444-444444444444" }], error: null }) },
          service_packages: {
            onInsert: (rows) => ({
              data: { id: "newpkg", ...((rows as any) ?? {}) },
              error: null,
            }),
          },
          service_package_items: {
            onInsert: (rows) => {
              insertedRows.push(rows);
              return { data: rows, error: null };
            },
          },
        },
        recordFilters,
      }),
    });

    const res = await POST(
      makeReq("http://localhost/api/admin/service-packages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Lv2",
          category: "coating",
          items: [{ menu_item_id: "44444444-4444-44d3-a444-444444444444", quantity: 1 }],
        }),
      }),
    );
    expect(res.status).toBe(201);
    expect(Array.isArray(insertedRows[0])).toBe(true);
    expect((insertedRows[0] as any[])[0].tenant_id).toBe(TENANT_A);
  });
});

describe("GET /api/admin/service-packages/[id] — cross-tenant isolation", () => {
  it("returns 404 when target package belongs to a different tenant", async () => {
    mocks.resolveCallerWithRole.mockResolvedValueOnce(ADMIN_A);
    mocks.createTenantScopedAdmin.mockReturnValueOnce({
      admin: buildAdmin({
        tables: {
          // tenant_id=A でフィルタされるため tenant B のパッケージは見えない
          service_packages: {
            onSelect: (filters) =>
              filters["tenant_id"] === TENANT_A
                ? { data: null, error: null }
                : { data: { id: "leaked", tenant_id: TENANT_B }, error: null },
          },
          service_package_items: { onSelect: () => ({ data: [], error: null }) },
        },
      }),
    });
    const res = await detailGET(makeReq("http://localhost/api/admin/service-packages/cross"), {
      params: Promise.resolve({ id: "cross" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/admin/service-packages/[id] (logical archive)", () => {
  it("sets is_archived=true scoped by tenant_id", async () => {
    mocks.resolveCallerWithRole.mockResolvedValueOnce(ADMIN_A);
    let updatedPatch: Record<string, unknown> | null = null;
    let updatedFilters: Record<string, unknown> | null = null;
    mocks.createTenantScopedAdmin.mockReturnValueOnce({
      admin: buildAdmin({
        tables: {
          service_packages: {
            onUpdate: (patch, filters) => {
              updatedPatch = patch;
              updatedFilters = filters;
              return { data: null, error: null };
            },
          },
        },
      }),
    });
    const res = await detailDELETE(makeReq("http://localhost/api/admin/service-packages/p1", { method: "DELETE" }), {
      params: Promise.resolve({ id: "p1" }),
    });
    expect(res.status).toBe(200);
    expect(updatedPatch).toEqual({ is_archived: true });
    expect((updatedFilters as any)?.tenant_id).toBe(TENANT_A);
    expect((updatedFilters as any)?.id).toBe("p1");
  });
});

describe("GET /api/admin/service-packages/[id]/expand", () => {
  it("returns expanded items + total scoped to tenant", async () => {
    mocks.resolveCallerWithRole.mockResolvedValueOnce(ADMIN_A);
    mocks.createTenantScopedAdmin.mockReturnValueOnce({
      admin: buildAdmin({
        tables: {
          service_packages: {
            onSelect: () => ({
              data: {
                id: "p1",
                tenant_id: TENANT_A,
                name: "Lv2",
                category: "coating",
                price_strategy: "sum_of_items",
                fixed_price: null,
                recommended_template_id: null,
                is_archived: false,
              },
              error: null,
            }),
          },
          service_package_items: {
            onSelect: () => ({
              data: [
                {
                  id: "spi-1",
                  package_id: "p1",
                  menu_item_id: "m-1",
                  quantity: 1,
                  override_unit_price: null,
                  is_archived: false,
                  sort_order: 0,
                },
              ],
              error: null,
            }),
          },
          menu_items: {
            onSelect: () => ({
              data: [{ id: "m-1", name: "ガラス", unit_price: 55000, tax_category: 10, unit: "式", is_active: true }],
              error: null,
            }),
          },
        },
      }),
    });
    const res = await expandGET(makeReq("http://localhost/api/admin/service-packages/p1/expand", { method: "GET" }), {
      params: Promise.resolve({ id: "p1" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: { line_total: number }[];
      items_total: number;
      price: number;
      package: { id: string };
    };
    expect(body.package.id).toBe("p1");
    expect(body.items[0].line_total).toBe(55000);
    expect(body.items_total).toBe(55000);
    expect(body.price).toBe(55000);
  });

  it("returns 404 for archived package", async () => {
    mocks.resolveCallerWithRole.mockResolvedValueOnce(ADMIN_A);
    mocks.createTenantScopedAdmin.mockReturnValueOnce({
      admin: buildAdmin({
        tables: {
          service_packages: {
            onSelect: () => ({
              data: {
                id: "p1",
                tenant_id: TENANT_A,
                name: "old",
                category: "coating",
                price_strategy: "sum_of_items",
                fixed_price: null,
                recommended_template_id: null,
                is_archived: true,
              },
              error: null,
            }),
          },
        },
      }),
    });
    const res = await expandGET(makeReq("http://localhost/api/admin/service-packages/p1/expand"), {
      params: Promise.resolve({ id: "p1" }),
    });
    expect(res.status).toBe(404);
  });
});
