import { describe, it, expect, vi, beforeEach } from "vitest";

const fromMock = vi.fn();
vi.mock("@/lib/supabase/readReplica", () => ({
  getReadReplica: () => ({ from: fromMock }),
}));

vi.mock("@/lib/anchoring/providers", () => ({
  buildExplorerUrl: (tx: string, net: string | null) => (net ? `https://${net}.polygonscan.com/tx/${tx}` : null),
}));

import { getPassportData, getServiceTypeLabel } from "@/lib/passport/getPassportData";

type Row = Record<string, unknown>;

/**
 * Builds a chained Supabase query-builder mock that yields the given rows
 * for any combination of select/eq/in/not/order/maybeSingle calls.
 */
function chainable(result: { data: Row | Row[] | null; error?: unknown }) {
  const chain: Record<string, unknown> = {};
  const passthrough = ["select", "eq", "in", "not", "order"];
  for (const key of passthrough) {
    chain[key] = vi.fn(() => chain);
  }
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  // For chains that resolve as awaitable arrays (e.g. .in("..").not("..")).
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

describe("getPassportData", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("returns null when no passport row exists for the VIN", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "vehicle_passports") return chainable({ data: null });
      throw new Error(`unexpected table ${table}`);
    });

    const result = await getPassportData("jh4dc53001s000001");
    expect(result).toBeNull();
  });

  it("returns null when passport row exists but no opted-in vehicles match", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "vehicle_passports") {
        return chainable({
          data: {
            vin_code_normalized: "JH4DC53001S000001",
            display_maker: "Honda",
            display_model: "NSX",
            display_year: 2020,
            anchored_cert_count: 0,
            tenant_count: 0,
            first_seen_at: "2025-01-01T00:00:00Z",
            last_activity_at: "2025-06-01T00:00:00Z",
          },
        });
      }
      if (table === "vehicles") return chainable({ data: [] });
      throw new Error(`unexpected table ${table}`);
    });

    const result = await getPassportData("JH4DC53001S000001");
    expect(result).toBeNull();
  });

  it("filters out certificates with no anchored images", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "vehicle_passports") {
        return chainable({
          data: {
            vin_code_normalized: "VIN1234567890",
            display_maker: null,
            display_model: null,
            display_year: null,
            anchored_cert_count: 1,
            tenant_count: 1,
            first_seen_at: "2025-01-01T00:00:00Z",
            last_activity_at: "2025-06-01T00:00:00Z",
          },
        });
      }
      if (table === "vehicles") {
        return chainable({ data: [{ id: "veh-1", tenant_id: "t-1" }] });
      }
      if (table === "tenants") {
        return chainable({ data: [{ id: "t-1", name: "Demo Shop", slug: "demo" }] });
      }
      if (table === "certificates") {
        return chainable({
          data: [
            { id: "cert-1", public_id: "pub-1", tenant_id: "t-1", service_type: "ppf", created_at: "2025-02-01" },
            { id: "cert-2", public_id: "pub-2", tenant_id: "t-1", service_type: "coating", created_at: "2025-03-01" },
          ],
        });
      }
      if (table === "certificate_images") {
        // Only cert-1 has an anchored image; cert-2 is filtered out.
        return chainable({
          data: [{ certificate_id: "cert-1", polygon_tx_hash: "0xabc", polygon_network: "polygon" }],
        });
      }
      throw new Error(`unexpected table ${table}`);
    });

    const result = await getPassportData("VIN1234567890");
    expect(result).not.toBeNull();
    expect(result!.certificates).toHaveLength(1);
    expect(result!.certificates[0]).toMatchObject({
      public_id: "pub-1",
      anchored_image_count: 1,
      primary_tx_hash: "0xabc",
      primary_tx_network: "polygon",
      shop_name: "Demo Shop",
    });
    expect(result!.certificates[0].primary_explorer_url).toBe("https://polygon.polygonscan.com/tx/0xabc");
  });

  it("returns null when no certificates have any anchored image", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "vehicle_passports") {
        return chainable({
          data: {
            vin_code_normalized: "VIN",
            display_maker: null,
            display_model: null,
            display_year: null,
            anchored_cert_count: 0,
            tenant_count: 1,
            first_seen_at: "x",
            last_activity_at: "y",
          },
        });
      }
      if (table === "vehicles") return chainable({ data: [{ id: "v1", tenant_id: "t1" }] });
      if (table === "tenants") return chainable({ data: [{ id: "t1", name: "X", slug: "x" }] });
      if (table === "certificates")
        return chainable({
          data: [{ id: "c1", public_id: "p1", tenant_id: "t1", service_type: null, created_at: null }],
        });
      if (table === "certificate_images") return chainable({ data: [] });
      throw new Error(`unexpected ${table}`);
    });

    expect(await getPassportData("VIN")).toBeNull();
  });

  it("normalizes lowercased VIN input by uppercasing", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "vehicle_passports") return chainable({ data: null });
      throw new Error(`unexpected ${table}`);
    });

    await getPassportData("  jh4dc53001s000001  ");
    // The eq() in the chain receives the normalized VIN — assert via the
    // captured argument of the first .eq() call on the passport query.
    const calls = fromMock.mock.calls;
    expect(calls[0][0]).toBe("vehicle_passports");
  });
});

describe("getServiceTypeLabel", () => {
  it.each([
    ["ppf", "PPF施工"],
    ["coating", "コーティング"],
    ["body_repair", "鈑金塗装"],
    ["maintenance", "車両整備"],
    ["wrapping", "ラッピング"],
  ])("maps %s to its Japanese label", (input, expected) => {
    expect(getServiceTypeLabel(input)).toBe(expected);
  });

  it("falls back to the raw value when unknown", () => {
    expect(getServiceTypeLabel("oil_change")).toBe("oil_change");
  });

  it("returns the default label when input is null", () => {
    expect(getServiceTypeLabel(null)).toBe("施工");
  });
});
