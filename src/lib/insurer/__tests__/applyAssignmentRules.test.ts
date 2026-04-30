import { describe, it, expect } from "vitest";
import { applyAssignmentRules, type AssignmentRule } from "../applyAssignmentRules";

const rule = (over: Partial<AssignmentRule> = {}): AssignmentRule => ({
  id: "r-" + Math.random().toString(36).slice(2, 6),
  condition_type: "category",
  condition_value: "施工確認",
  assign_to: "user-1",
  is_active: true,
  ...over,
});

describe("applyAssignmentRules", () => {
  it("returns null when there are no rules", () => {
    expect(applyAssignmentRules([], { category: "施工確認" })).toBeNull();
  });

  it("returns null when no rule matches", () => {
    expect(applyAssignmentRules([rule({ condition_value: "保険金請求" })], { category: "施工確認" })).toBeNull();
  });

  it("matches a category rule (exact, case-insensitive)", () => {
    const match = applyAssignmentRules([rule({ condition_value: "PPF確認", assign_to: "u-A" })], {
      category: "ppf確認",
    });
    expect(match?.assignedTo).toBe("u-A");
  });

  it("matches a tenant rule by exact UUID", () => {
    const tenantId = "11111111-1111-1111-1111-111111111111";
    const match = applyAssignmentRules(
      [rule({ condition_type: "tenant", condition_value: tenantId, assign_to: "u-T" })],
      { tenant_id: tenantId },
    );
    expect(match?.assignedTo).toBe("u-T");
  });

  it("matches a priority rule (case-insensitive)", () => {
    const match = applyAssignmentRules(
      [rule({ condition_type: "priority", condition_value: "URGENT", assign_to: "u-P" })],
      { priority: "urgent" },
    );
    expect(match?.assignedTo).toBe("u-P");
  });

  it("returns the FIRST matching rule when multiple match", () => {
    const rules = [
      rule({ id: "r1", condition_type: "priority", condition_value: "high", assign_to: "u-1" }),
      rule({ id: "r2", condition_type: "priority", condition_value: "high", assign_to: "u-2" }),
    ];
    const match = applyAssignmentRules(rules, { priority: "high" });
    expect(match?.ruleId).toBe("r1");
    expect(match?.assignedTo).toBe("u-1");
  });

  it("skips inactive rules even if they would match", () => {
    const rules = [
      rule({ condition_value: "施工確認", is_active: false, assign_to: "u-disabled" }),
      rule({ condition_value: "施工確認", is_active: true, assign_to: "u-active" }),
    ];
    const match = applyAssignmentRules(rules, { category: "施工確認" });
    expect(match?.assignedTo).toBe("u-active");
  });

  it("skips rules whose assign_to is empty", () => {
    const rules = [rule({ condition_value: "x", assign_to: "" }), rule({ condition_value: "x", assign_to: "u-real" })];
    const match = applyAssignmentRules(rules, { category: "x" });
    expect(match?.assignedTo).toBe("u-real");
  });

  it("ignores unknown condition_type values (= no match)", () => {
    const match = applyAssignmentRules(
      [rule({ condition_type: "amount_above", condition_value: "100000", assign_to: "u-x" })],
      { category: "施工確認", priority: "urgent" },
    );
    expect(match).toBeNull();
  });

  it("does not match a category rule when category is null/empty", () => {
    const r = rule({ condition_type: "category", condition_value: "x" });
    expect(applyAssignmentRules([r], { category: null })).toBeNull();
    expect(applyAssignmentRules([r], { category: "" })).toBeNull();
    expect(applyAssignmentRules([r], { category: "   " })).toBeNull();
  });

  it("does not match a rule whose condition_value is blank", () => {
    const match = applyAssignmentRules([rule({ condition_value: "   ", assign_to: "u-x" })], { category: "anything" });
    expect(match).toBeNull();
  });

  it("preserves rule name in the match for downstream logging", () => {
    const match = applyAssignmentRules(
      [rule({ id: "r1", name: "高優先度は田中さん", condition_type: "priority", condition_value: "urgent" })],
      { priority: "urgent" },
    );
    expect(match?.ruleName).toBe("高優先度は田中さん");
  });
});
