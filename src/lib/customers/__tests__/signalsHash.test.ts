import { describe, it, expect } from "vitest";
import { computeSignalsHash } from "../signalsHash";
import { deriveSignals, type CustomerSignals } from "../signals";

const NOW = new Date("2026-04-30T12:00:00Z");

function emptySignals(): CustomerSignals {
  return deriveSignals({
    customer: { id: "c1" },
    vehicles: [],
    certificates: [],
    reservations: [],
    invoices: [],
    now: NOW,
  });
}

describe("computeSignalsHash", () => {
  it("returns the same hash for the same signals", async () => {
    const a = await computeSignalsHash(emptySignals());
    const b = await computeSignalsHash(emptySignals());
    expect(a).toBe(b);
  });

  it("returns a 64-char hex string (sha256)", async () => {
    const h = await computeSignalsHash(emptySignals());
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces a different hash when vehicleCount changes", async () => {
    const a = await computeSignalsHash(emptySignals());
    const withVehicle = deriveSignals({
      customer: { id: "c1" },
      vehicles: [{ id: "v1" }],
      certificates: [],
      reservations: [],
      invoices: [],
      now: NOW,
    });
    const b = await computeSignalsHash(withVehicle);
    expect(a).not.toBe(b);
  });

  it("produces a different hash when overdueInvoiceCount changes", async () => {
    const a = await computeSignalsHash(emptySignals());
    const withOverdue = deriveSignals({
      customer: { id: "c1" },
      vehicles: [],
      certificates: [],
      reservations: [],
      invoices: [{ id: "i1", status: "overdue", total: 1000, due_date: null }],
      now: NOW,
    });
    const b = await computeSignalsHash(withOverdue);
    expect(a).not.toBe(b);
  });

  it("returns the same hash when daysSinceLastVisit changes within the same 30-day bucket", async () => {
    // 同じバケット (例: 5 日 と 10 日は両方 bucket 0)
    const day5 = deriveSignals({
      customer: { id: "c1" },
      vehicles: [],
      certificates: [],
      reservations: [{ id: "r1", status: "completed", scheduled_date: "2026-04-25" }],
      invoices: [],
      now: NOW,
    });
    const day10 = deriveSignals({
      customer: { id: "c1" },
      vehicles: [],
      certificates: [],
      reservations: [{ id: "r1", status: "completed", scheduled_date: "2026-04-20" }],
      invoices: [],
      now: NOW,
    });
    const a = await computeSignalsHash(day5);
    const b = await computeSignalsHash(day10);
    expect(a).toBe(b);
  });

  it("produces a different hash when crossing a 30-day bucket boundary", async () => {
    // 25 日前 (bucket 0) vs 35 日前 (bucket 1)
    const day25 = deriveSignals({
      customer: { id: "c1" },
      vehicles: [],
      certificates: [],
      reservations: [{ id: "r1", status: "completed", scheduled_date: "2026-04-05" }],
      invoices: [],
      now: NOW,
    });
    const day35 = deriveSignals({
      customer: { id: "c1" },
      vehicles: [],
      certificates: [],
      reservations: [{ id: "r1", status: "completed", scheduled_date: "2026-03-26" }],
      invoices: [],
      now: NOW,
    });
    const a = await computeSignalsHash(day25);
    const b = await computeSignalsHash(day35);
    expect(a).not.toBe(b);
  });
});
