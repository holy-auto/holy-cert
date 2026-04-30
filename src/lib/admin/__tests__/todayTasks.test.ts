import { describe, it, expect } from "vitest";
import { deriveTodayTasks, type TodayReservation, type TodayInvoice, type TodayCertificate } from "../todayTasks";

const NOW = new Date("2026-04-30T12:00:00Z");
const TODAY = "2026-04-30";

function r(over: Partial<TodayReservation> = {}): TodayReservation {
  return {
    id: "r-" + Math.random().toString(36).slice(2, 6),
    status: "confirmed",
    scheduled_date: TODAY,
    title: "test",
    ...over,
  };
}

function i(over: Partial<TodayInvoice> = {}): TodayInvoice {
  return {
    id: "i-" + Math.random().toString(36).slice(2, 6),
    status: "sent",
    total: 10000,
    due_date: null,
    ...over,
  };
}

function c(over: Partial<TodayCertificate> = {}): TodayCertificate {
  return {
    id: "c-" + Math.random().toString(36).slice(2, 6),
    status: "active",
    expiry_date: null,
    ...over,
  };
}

function emptyInput() {
  return {
    reservations: [] as TodayReservation[],
    invoices: [] as TodayInvoice[],
    certificates: [] as TodayCertificate[],
    now: NOW,
  };
}
const empty = emptyInput();

describe("deriveTodayTasks", () => {
  it("returns empty list when nothing is actionable", () => {
    expect(deriveTodayTasks(empty)).toEqual([]);
  });

  it("counts in_progress reservations and tags them as urgent / top priority", () => {
    const tiles = deriveTodayTasks({
      ...empty,
      reservations: [r({ status: "in_progress" }), r({ status: "in_progress" }), r({ status: "completed" })],
    });
    expect(tiles[0].id).toBe("in_progress_jobs");
    expect(tiles[0].count).toBe(2);
    expect(tiles[0].tone).toBe("urgent");
  });

  it("counts today visits but excludes cancelled / completed / in_progress", () => {
    const tiles = deriveTodayTasks({
      ...empty,
      reservations: [
        r({ status: "confirmed", scheduled_date: TODAY }),
        r({ status: "arrived", scheduled_date: TODAY }),
        r({ status: "cancelled", scheduled_date: TODAY }),
        r({ status: "completed", scheduled_date: TODAY }),
        r({ status: "in_progress", scheduled_date: TODAY }), // 別タイルに集計される
        r({ status: "confirmed", scheduled_date: "2026-05-01" }), // 明日の予約
      ],
    });
    const visits = tiles.find((t) => t.id === "today_visits");
    expect(visits?.count).toBe(2);
  });

  it("flags overdue invoices and aggregates total amount", () => {
    const tiles = deriveTodayTasks({
      ...empty,
      invoices: [
        i({ status: "overdue", total: 5000 }),
        i({ status: "sent", total: 3000, due_date: "2026-04-01" }), // 過去の due → overdue 扱い
        i({ status: "sent", total: 99999, due_date: "2026-12-31" }), // 未来の due → unpaid だが overdue ではない
        i({ status: "paid", total: 1 }),
      ],
    });
    const overdue = tiles.find((t) => t.id === "overdue_invoices");
    expect(overdue?.count).toBe(2);
    expect(overdue?.tone).toBe("urgent");
    expect(overdue?.hint).toContain("¥8,000");
  });

  it("falls back to 'unpaid_invoices' tile only when there are no overdue but some unpaid", () => {
    const tilesWithBoth = deriveTodayTasks({
      ...empty,
      invoices: [i({ status: "overdue", total: 1 }), i({ status: "sent", total: 2 })],
    });
    expect(tilesWithBoth.find((t) => t.id === "unpaid_invoices")).toBeUndefined();

    const tilesUnpaidOnly = deriveTodayTasks({
      ...empty,
      invoices: [i({ status: "sent", total: 4000, due_date: "2026-12-31" })],
    });
    expect(tilesUnpaidOnly.find((t) => t.id === "unpaid_invoices")?.count).toBe(1);
  });

  it("counts certificates expiring within the window (active only)", () => {
    const tiles = deriveTodayTasks({
      ...empty,
      certificates: [
        c({ status: "active", expiry_date: "2026-05-10" }), // 10 日後 → 入る
        c({ status: "active", expiry_date: "2026-04-29" }), // 昨日 → 入らない (過去)
        c({ status: "active", expiry_date: "2026-06-30" }), // 60 日後 → window 30 では入らない
        c({ status: "void", expiry_date: "2026-05-05" }), // void は無視
      ],
    });
    const expiring = tiles.find((t) => t.id === "expiring_certificates");
    expect(expiring?.count).toBe(1);
  });

  it("respects a custom expiring window", () => {
    const tiles = deriveTodayTasks({
      ...empty,
      certificates: [c({ status: "active", expiry_date: "2026-06-15" })],
      expiringWindowDays: 90,
    });
    expect(tiles.find((t) => t.id === "expiring_certificates")?.count).toBe(1);
  });

  it("sorts tiles by priority (urgent first), then by count desc", () => {
    const tiles = deriveTodayTasks({
      ...empty,
      reservations: [
        r({ status: "in_progress" }), // urgent (priority 0)
        r({ status: "confirmed", scheduled_date: TODAY }), // normal (priority 1)
        r({ status: "confirmed", scheduled_date: TODAY }),
        r({ status: "confirmed", scheduled_date: TODAY }),
      ],
      invoices: [i({ status: "overdue", total: 1 })], // urgent (priority 0)
      certificates: [c({ status: "active", expiry_date: "2026-05-10" })], // warn (priority 2)
    });
    const ids = tiles.map((t) => t.id);
    // priority 0 が先頭、次に 1、最後に 2
    expect(ids.slice(0, 2).sort()).toEqual(["in_progress_jobs", "overdue_invoices"]);
    expect(ids[ids.length - 1]).toBe("expiring_certificates");
  });
});
