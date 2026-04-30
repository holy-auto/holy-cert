import { describe, it, expect } from "vitest";
import {
  deriveSignals,
  type SignalCustomer,
  type SignalReservation,
  type SignalInvoice,
  type SignalCertificate,
  type SignalVehicle,
} from "../signals";

const NOW = new Date("2026-04-30T12:00:00Z");

const customer: SignalCustomer = { id: "cust-1", created_at: "2025-01-01" };

function res(over: Partial<SignalReservation> = {}): SignalReservation {
  return {
    id: "r-" + Math.random().toString(36).slice(2, 6),
    status: "confirmed",
    scheduled_date: "2026-04-15",
    title: "コーティング",
    ...over,
  };
}

function inv(over: Partial<SignalInvoice> = {}): SignalInvoice {
  return {
    id: "i-" + Math.random().toString(36).slice(2, 6),
    status: "sent",
    total: 10000,
    due_date: null,
    ...over,
  };
}

function cert(over: Partial<SignalCertificate> = {}): SignalCertificate {
  return {
    public_id: "p-" + Math.random().toString(36).slice(2, 6),
    status: "active",
    created_at: "2026-04-01T00:00:00Z",
    ...over,
  };
}

const baseInput = {
  customer,
  vehicles: [] as SignalVehicle[],
  certificates: [] as SignalCertificate[],
  reservations: [] as SignalReservation[],
  invoices: [] as SignalInvoice[],
  now: NOW,
};

describe("deriveSignals", () => {
  it("returns empty signals for a brand-new customer with no data", () => {
    const s = deriveSignals(baseInput);
    expect(s.vehicleCount).toBe(0);
    expect(s.totalCertificateCount).toBe(0);
    expect(s.activeCertificateCount).toBe(0);
    expect(s.daysSinceLastVisit).toBeNull();
    expect(s.upcomingReservation).toBeNull();
    expect(s.inProgressReservation).toBeNull();
    expect(s.completedReservationWithoutCertificate).toBeNull();
    expect(s.overdueInvoiceCount).toBe(0);
    expect(s.unpaidInvoiceCount).toBe(0);
    // 車両未登録は medium priority のアクション 1 件
    const ids = s.nextActions.map((a) => a.id);
    expect(ids).toContain("register_vehicle");
  });

  it("counts active vs. total certificates separately", () => {
    const s = deriveSignals({
      ...baseInput,
      certificates: [cert({ status: "active" }), cert({ status: "active" }), cert({ status: "void" })],
    });
    expect(s.totalCertificateCount).toBe(3);
    expect(s.activeCertificateCount).toBe(2);
  });

  it("picks the most recent completed reservation as last visit", () => {
    const s = deriveSignals({
      ...baseInput,
      reservations: [
        res({ status: "completed", scheduled_date: "2026-01-10" }),
        res({ status: "completed", scheduled_date: "2026-04-01", title: "PPF" }),
        res({ status: "cancelled", scheduled_date: "2026-04-29" }),
      ],
    });
    expect(s.lastCompletedReservation?.title).toBe("PPF");
    expect(s.daysSinceLastVisit).toBeGreaterThan(20);
    expect(s.daysSinceLastVisit).toBeLessThan(40);
  });

  it("picks the nearest future reservation as upcoming", () => {
    const s = deriveSignals({
      ...baseInput,
      reservations: [
        res({ status: "confirmed", scheduled_date: "2026-06-01" }),
        res({ status: "confirmed", scheduled_date: "2026-05-05", title: "A" }),
        res({ status: "completed", scheduled_date: "2026-05-02" }),
      ],
    });
    expect(s.upcomingReservation?.title).toBe("A");
    expect(s.nextActions.some((a) => a.id === "prepare_upcoming_reservation")).toBe(true);
  });

  it("ignores past reservations even if status is confirmed", () => {
    const s = deriveSignals({
      ...baseInput,
      reservations: [res({ status: "confirmed", scheduled_date: "2026-04-01" })],
    });
    expect(s.upcomingReservation).toBeNull();
  });

  it("flags an in_progress reservation with high-priority action", () => {
    const s = deriveSignals({
      ...baseInput,
      reservations: [res({ status: "in_progress", id: "r-active", title: "施工中" })],
    });
    expect(s.inProgressReservation?.id).toBe("r-active");
    const top = s.nextActions[0];
    expect(top.id).toBe("open_in_progress_job");
    expect(top.priority).toBe("high");
    expect(top.cta.href).toBe("/admin/jobs/r-active");
  });

  it("counts invoices that are explicitly overdue", () => {
    const s = deriveSignals({
      ...baseInput,
      invoices: [
        inv({ status: "overdue", total: 5000 }),
        inv({ status: "overdue", total: 3000 }),
        inv({ status: "paid", total: 99999 }),
      ],
    });
    expect(s.overdueInvoiceCount).toBe(2);
    expect(s.overdueInvoiceTotal).toBe(8000);
    expect(s.unpaidInvoiceCount).toBe(2);
    expect(s.unpaidInvoiceTotal).toBe(8000);
    expect(s.nextActions.some((a) => a.id === "review_overdue_invoice")).toBe(true);
  });

  it("treats sent invoices past due_date as overdue", () => {
    const s = deriveSignals({
      ...baseInput,
      invoices: [
        inv({ status: "sent", total: 1000, due_date: "2026-01-15" }),
        inv({ status: "sent", total: 2000, due_date: "2026-12-31" }),
      ],
    });
    expect(s.overdueInvoiceCount).toBe(1);
    expect(s.overdueInvoiceTotal).toBe(1000);
    // sent is unpaid regardless of due_date
    expect(s.unpaidInvoiceCount).toBe(2);
    expect(s.unpaidInvoiceTotal).toBe(3000);
  });

  it("falls back to follow_up_unpaid when nothing is overdue but there are unpaid invoices", () => {
    const s = deriveSignals({
      ...baseInput,
      invoices: [inv({ status: "sent", total: 4000, due_date: "2026-12-31" })],
    });
    expect(s.overdueInvoiceCount).toBe(0);
    expect(s.nextActions.some((a) => a.id === "follow_up_unpaid")).toBe(true);
    expect(s.nextActions.some((a) => a.id === "review_overdue_invoice")).toBe(false);
  });

  it("suggests issuing a certificate when a completed visit lacks an active certificate", () => {
    const s = deriveSignals({
      ...baseInput,
      reservations: [res({ status: "completed", scheduled_date: "2026-04-20" })],
      certificates: [],
    });
    expect(s.completedReservationWithoutCertificate).not.toBeNull();
    expect(s.nextActions.some((a) => a.id === "issue_certificate_for_completed")).toBe(true);
  });

  it("does not suggest re-issuing when at least one active certificate exists", () => {
    const s = deriveSignals({
      ...baseInput,
      reservations: [res({ status: "completed", scheduled_date: "2026-04-20" })],
      certificates: [cert({ status: "active" })],
    });
    expect(s.completedReservationWithoutCertificate).toBeNull();
    expect(s.nextActions.some((a) => a.id === "issue_certificate_for_completed")).toBe(false);
  });

  it("suggests reengagement only when last visit > 180 days and nothing is upcoming/in-progress", () => {
    const s = deriveSignals({
      ...baseInput,
      vehicles: [{ id: "v1" }],
      reservations: [res({ status: "completed", scheduled_date: "2025-08-01" })],
      certificates: [cert({ status: "active" })],
    });
    expect(s.daysSinceLastVisit).toBeGreaterThanOrEqual(180);
    expect(s.nextActions.some((a) => a.id === "reengage_dormant_customer")).toBe(true);
  });

  it("does not suggest reengagement when an upcoming reservation exists", () => {
    const s = deriveSignals({
      ...baseInput,
      vehicles: [{ id: "v1" }],
      reservations: [
        res({ status: "completed", scheduled_date: "2025-08-01" }),
        res({ status: "confirmed", scheduled_date: "2026-05-05" }),
      ],
      certificates: [cert({ status: "active" })],
    });
    expect(s.nextActions.some((a) => a.id === "reengage_dormant_customer")).toBe(false);
    expect(s.nextActions.some((a) => a.id === "prepare_upcoming_reservation")).toBe(true);
  });

  it("returns at most 3 next actions, prioritizing high before medium before low", () => {
    const s = deriveSignals({
      ...baseInput,
      reservations: [
        res({ status: "in_progress", id: "in-prog" }),
        res({ status: "confirmed", scheduled_date: "2026-05-05" }),
        res({ status: "completed", scheduled_date: "2025-07-01" }),
      ],
      invoices: [inv({ status: "overdue", total: 1000 }), inv({ status: "sent", total: 2000 })],
    });
    expect(s.nextActions.length).toBeLessThanOrEqual(3);
    const priorities = s.nextActions.map((a) => a.priority);
    // high が medium / low より前に来る
    const firstMediumIdx = priorities.indexOf("medium");
    const lastHighIdx = priorities.lastIndexOf("high");
    if (firstMediumIdx !== -1 && lastHighIdx !== -1) {
      expect(lastHighIdx).toBeLessThan(firstMediumIdx);
    }
  });
});
