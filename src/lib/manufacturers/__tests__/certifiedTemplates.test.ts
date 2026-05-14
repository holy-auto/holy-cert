import { describe, it, expect, vi, beforeEach } from "vitest";

// We mock @/lib/supabase/admin so the helper exercises only the
// query-shape contract, not a real Supabase client. The mock returns
// chained query builders that resolve from canned tables.

type Row = Record<string, unknown>;

const tables: Record<string, Row[]> = {
  manufacturer_certified_tenants: [],
  manufacturers: [],
  manufacturer_templates: [],
};

function makeQuery(tableName: string) {
  const rows = [...(tables[tableName] ?? [])];
  const filters: Array<(r: Row) => boolean> = [];

  const q = {
    select() {
      return q;
    },
    eq(column: string, value: unknown) {
      filters.push((r) => r[column] === value);
      return q;
    },
    in(column: string, values: unknown[]) {
      filters.push((r) => values.includes(r[column]));
      return q;
    },
    order() {
      return q;
    },
    maybeSingle() {
      const filtered = rows.filter((r) => filters.every((f) => f(r)));
      return Promise.resolve({ data: filtered[0] ?? null, error: null });
    },
    then<TResult1 = { data: Row[]; error: null }, TResult2 = never>(
      onfulfilled?: ((value: { data: Row[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) {
      const filtered = rows.filter((r) => filters.every((f) => f(r)));
      return Promise.resolve({ data: filtered, error: null }).then(onfulfilled, onrejected);
    },
  };

  return q;
}

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleAdmin: () => ({
    from: (table: string) => makeQuery(table),
  }),
}));

import { listCertifiedManufacturerTemplates, resolveCertifiedTemplateForTenant } from "../certifiedTemplates";

const TENANT_A = "00000000-0000-0000-0000-000000000001";
const TENANT_B = "00000000-0000-0000-0000-000000000002";
const MFR_X = "10000000-0000-0000-0000-000000000001";
const MFR_Y = "10000000-0000-0000-0000-000000000002";
const TPL_X1 = "20000000-0000-0000-0000-000000000001";
const TPL_X2 = "20000000-0000-0000-0000-000000000002";
const TPL_Y1 = "20000000-0000-0000-0000-000000000003";

beforeEach(() => {
  tables.manufacturer_certified_tenants = [
    {
      id: "c1",
      manufacturer_id: MFR_X,
      tenant_id: TENANT_A,
      status: "active",
    },
    {
      id: "c2",
      manufacturer_id: MFR_Y,
      tenant_id: TENANT_A,
      status: "revoked", // tenant A used to be certified by Y
    },
    {
      id: "c3",
      manufacturer_id: MFR_X,
      tenant_id: TENANT_B,
      status: "active",
    },
  ];
  tables.manufacturers = [
    { id: MFR_X, name: "Maker X", slug: "x", logo_asset_path: null, is_active: true },
    { id: MFR_Y, name: "Maker Y", slug: "y", logo_asset_path: null, is_active: true },
  ];
  tables.manufacturer_templates = [
    { id: TPL_X1, manufacturer_id: MFR_X, name: "X-1", is_active: true, sort_order: 0 },
    { id: TPL_X2, manufacturer_id: MFR_X, name: "X-2", is_active: true, sort_order: 1 },
    { id: TPL_Y1, manufacturer_id: MFR_Y, name: "Y-1", is_active: true, sort_order: 0 },
  ];
});

describe("listCertifiedManufacturerTemplates", () => {
  it("returns empty array when tenantId is missing", async () => {
    expect(await listCertifiedManufacturerTemplates("")).toEqual([]);
  });

  it("returns only manufacturers the tenant is actively certified by", async () => {
    const entries = await listCertifiedManufacturerTemplates(TENANT_A);
    expect(entries.map((e) => e.manufacturer.id)).toEqual([MFR_X]);
    expect(entries[0].templates.map((t) => t.id)).toEqual([TPL_X1, TPL_X2]);
  });

  it("does not surface templates of revoked certifications", async () => {
    const entries = await listCertifiedManufacturerTemplates(TENANT_A);
    expect(entries.find((e) => e.manufacturer.id === MFR_Y)).toBeUndefined();
  });

  it("returns empty when no certifications exist", async () => {
    tables.manufacturer_certified_tenants = [];
    expect(await listCertifiedManufacturerTemplates(TENANT_A)).toEqual([]);
  });
});

describe("resolveCertifiedTemplateForTenant", () => {
  it("returns null for missing args", async () => {
    expect(await resolveCertifiedTemplateForTenant("", TPL_X1)).toBeNull();
    expect(await resolveCertifiedTemplateForTenant(TENANT_A, "")).toBeNull();
  });

  it("resolves template when tenant is certified by its manufacturer", async () => {
    const r = await resolveCertifiedTemplateForTenant(TENANT_A, TPL_X1);
    expect(r).not.toBeNull();
    expect(r!.template.id).toBe(TPL_X1);
    expect(r!.manufacturer.id).toBe(MFR_X);
  });

  it("returns null when tenant is not certified for the template's manufacturer", async () => {
    // Tenant A is revoked from Maker Y, so TPL_Y1 must be denied.
    expect(await resolveCertifiedTemplateForTenant(TENANT_A, TPL_Y1)).toBeNull();
  });

  it("returns null when template is inactive", async () => {
    tables.manufacturer_templates = tables.manufacturer_templates.map((t) =>
      t.id === TPL_X1 ? { ...t, is_active: false } : t,
    );
    expect(await resolveCertifiedTemplateForTenant(TENANT_A, TPL_X1)).toBeNull();
  });

  it("returns null when manufacturer is inactive", async () => {
    tables.manufacturers = tables.manufacturers.map((m) => (m.id === MFR_X ? { ...m, is_active: false } : m));
    expect(await resolveCertifiedTemplateForTenant(TENANT_A, TPL_X1)).toBeNull();
  });
});
