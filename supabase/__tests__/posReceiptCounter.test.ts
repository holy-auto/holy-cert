/**
 * Static migration audit for the POS receipt counter.
 *
 * Postgres' atomic UPSERT semantics are what guarantee race-free receipt
 * numbering — that's a DB-level guarantee we can't reproduce in a JS
 * unit test. What we CAN do here is assert that the migration code
 * actually uses the upgraded pattern (and didn't silently regress back
 * to the old COUNT(*) + advisory_lock approach when someone touches
 * pos_checkout in a future PR).
 *
 * SQL-level race test (manual, requires a real Supabase branch):
 *   docs/pos-receipt-counter-verification.md
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATION_PATH = join(
  __dirname,
  "..",
  "migrations",
  "20260512000000_pos_receipt_counter.sql",
);

const rawSql = readFileSync(MIGRATION_PATH, "utf-8");

/** Strip `-- single-line comments` so we never assert against doc text. */
const sql = rawSql
  .split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n");

describe("20260512000000_pos_receipt_counter.sql", () => {
  it("creates the pos_receipt_counters table with the expected composite PK", () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS pos_receipt_counters/);
    expect(sql).toMatch(/PRIMARY KEY \(tenant_id, year_month\)/);
  });

  it("uses ON CONFLICT DO UPDATE for the atomic increment (no COUNT, no advisory_lock)", () => {
    // The whole point of the migration is to replace these two patterns.
    // If a future edit reintroduces them in pos_checkout, this test fires.
    expect(sql).toMatch(/ON CONFLICT \(tenant_id, year_month\)\s+DO UPDATE/i);
    expect(sql).toMatch(/last_number = public\.pos_receipt_counters\.last_number \+ 1/);

    // The replaced pos_checkout body must NOT contain the old idioms.
    // We allow `COUNT` in comments but not in an active SQL statement.
    expect(sql).not.toMatch(/SELECT\s+COUNT\(\*\)\s*\+\s*1/i);
    expect(sql).not.toMatch(/pg_advisory_xact_lock/i);
  });

  it("preserves the existing pos_checkout signature so the route doesn't break", () => {
    // The TS route passes exactly these named parameters; if any are renamed
    // or removed without coordination, /api/admin/pos/checkout fails with
    // "function pos_checkout(...) does not exist".
    const requiredParams = [
      "p_tenant_id",
      "p_reservation_id",
      "p_customer_id",
      "p_store_id",
      "p_register_session_id",
      "p_payment_method",
      "p_amount",
      "p_received_amount",
      "p_items_json",
      "p_tax_rate",
      "p_note",
      "p_create_receipt",
      "p_user_id",
    ];
    for (const p of requiredParams) {
      expect(sql).toContain(`${p} `);
    }
  });

  it("backfills the counter from existing documents (so post-migration numbering continues the series)", () => {
    expect(sql).toMatch(/INSERT INTO pos_receipt_counters/);
    expect(sql).toMatch(/MAX\(CAST\(substring\(d\.doc_number from '-\(\\d\+\)\$'\) AS integer\)\)/);
    expect(sql).toMatch(/ON CONFLICT \(tenant_id, year_month\) DO NOTHING/);
  });

  it("keeps pos_checkout SECURITY DEFINER so the route can call it through the user-scoped client", () => {
    expect(sql).toMatch(/SECURITY DEFINER/);
    expect(sql).toMatch(/SET search_path = ''/);
  });
});
