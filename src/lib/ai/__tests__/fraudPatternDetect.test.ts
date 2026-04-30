import { describe, it, expect } from "vitest";
import { detectFraudRuleFlags, deriveRiskLevel } from "../fraudPatternDetect";

const baseInput = {
  claimAmount: 83500, // non-round, below high threshold → no flags
  certificateStatus: "active",
  existingClaimsForCertificate: 0,
  claimsLast7Days: 3,
  sameDaySameVehicle: 1,
};

describe("detectFraudRuleFlags", () => {
  it("returns no flags for a clean case", () => {
    expect(detectFraudRuleFlags(baseInput)).toHaveLength(0);
  });

  it("detects duplicate_claim when existing claims > 0", () => {
    const flags = detectFraudRuleFlags({ ...baseInput, existingClaimsForCertificate: 1 });
    expect(flags).toContain("duplicate_claim");
  });

  it("detects velocity_spike at default threshold (10)", () => {
    const flags = detectFraudRuleFlags({ ...baseInput, claimsLast7Days: 10 });
    expect(flags).toContain("velocity_spike");
  });

  it("does not flag velocity below threshold", () => {
    const flags = detectFraudRuleFlags({ ...baseInput, claimsLast7Days: 9 });
    expect(flags).not.toContain("velocity_spike");
  });

  it("respects custom velocity threshold", () => {
    const flags = detectFraudRuleFlags({ ...baseInput, claimsLast7Days: 5, velocityThreshold: 5 });
    expect(flags).toContain("velocity_spike");
  });

  it("detects round_amount for multiples of 10000", () => {
    const flags = detectFraudRuleFlags({ ...baseInput, claimAmount: 100000 });
    expect(flags).toContain("round_amount");
  });

  it("does not flag amounts with non-zero last digits", () => {
    const flags = detectFraudRuleFlags({ ...baseInput, claimAmount: 85000 });
    expect(flags).not.toContain("round_amount");
  });

  it("does not flag null amount", () => {
    const flags = detectFraudRuleFlags({ ...baseInput, claimAmount: null });
    expect(flags).not.toContain("round_amount");
  });

  it("detects same_day_multi when > 1", () => {
    const flags = detectFraudRuleFlags({ ...baseInput, sameDaySameVehicle: 2 });
    expect(flags).toContain("same_day_multi");
  });

  it("detects certificate_void", () => {
    const flags = detectFraudRuleFlags({ ...baseInput, certificateStatus: "void" });
    expect(flags).toContain("certificate_void");
  });

  it("detects high_claim_amount at default threshold (500000)", () => {
    const flags = detectFraudRuleFlags({ ...baseInput, claimAmount: 500000 });
    expect(flags).toContain("high_claim_amount");
  });

  it("respects custom high amount threshold", () => {
    const flags = detectFraudRuleFlags({ ...baseInput, claimAmount: 200000, highAmountThreshold: 200000 });
    expect(flags).toContain("high_claim_amount");
  });

  it("can detect multiple flags simultaneously", () => {
    const flags = detectFraudRuleFlags({
      ...baseInput,
      existingClaimsForCertificate: 1,
      claimAmount: 1000000,
    });
    expect(flags).toContain("duplicate_claim");
    expect(flags).toContain("round_amount");
    expect(flags).toContain("high_claim_amount");
  });
});

describe("deriveRiskLevel", () => {
  it("returns clear when no flags", () => {
    expect(deriveRiskLevel([])).toBe("clear");
  });

  it("returns high for duplicate_claim", () => {
    expect(deriveRiskLevel(["duplicate_claim"])).toBe("high");
  });

  it("returns high for certificate_void", () => {
    expect(deriveRiskLevel(["certificate_void"])).toBe("high");
  });

  it("returns high for same_day_multi", () => {
    expect(deriveRiskLevel(["same_day_multi"])).toBe("high");
  });

  it("returns medium for velocity_spike alone", () => {
    expect(deriveRiskLevel(["velocity_spike"])).toBe("medium");
  });

  it("returns medium for high_claim_amount alone", () => {
    expect(deriveRiskLevel(["high_claim_amount"])).toBe("medium");
  });

  it("returns low for round_amount alone", () => {
    expect(deriveRiskLevel(["round_amount"])).toBe("low");
  });

  it("high-risk flag overrides medium flag", () => {
    expect(deriveRiskLevel(["velocity_spike", "certificate_void"])).toBe("high");
  });
});
