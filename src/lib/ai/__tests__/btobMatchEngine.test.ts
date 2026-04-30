import { describe, it, expect } from "vitest";
import { scoreTenant, rankCandidates, type TenantCandidate, type MatchRequirements } from "../btobMatchEngine";

function tenant(over: Partial<TenantCandidate> = {}): TenantCandidate {
  return {
    tenantId: "t-" + Math.random().toString(36).slice(2, 6),
    name: "テスト施工店",
    serviceCategories: ["ppf", "coating"],
    prefecture: "東京都",
    recentCaseCount: 5,
    hasActiveContract: false,
    avgRating: 4.0,
    ...over,
  };
}

const req: MatchRequirements = { categories: ["ppf"], prefecture: "東京都" };

describe("scoreTenant", () => {
  it("gives full category score when all required categories match", () => {
    const { categoryMatch } = scoreTenant(tenant({ serviceCategories: ["ppf"] }), req);
    expect(categoryMatch).toBe(40);
  });

  it("gives 0 category score when no categories match", () => {
    const { categoryMatch } = scoreTenant(tenant({ serviceCategories: ["tint"] }), req);
    expect(categoryMatch).toBe(0);
  });

  it("gives partial category score for partial match", () => {
    const { categoryMatch } = scoreTenant(tenant({ serviceCategories: ["ppf"] }), {
      categories: ["ppf", "coating"],
      prefecture: null,
    });
    expect(categoryMatch).toBe(20); // 1/2 × 40
  });

  it("gives 40 category score when no categories required", () => {
    const { categoryMatch } = scoreTenant(tenant(), { categories: [], prefecture: null });
    expect(categoryMatch).toBe(40);
  });

  it("gives contractActive bonus of 20 when active contract", () => {
    const { contractActive } = scoreTenant(tenant({ hasActiveContract: true }), req);
    expect(contractActive).toBe(20);
  });

  it("gives 0 contractActive when no contract", () => {
    const { contractActive } = scoreTenant(tenant({ hasActiveContract: false }), req);
    expect(contractActive).toBe(0);
  });

  it("penalizes -10 for zero recent cases", () => {
    const { caseVolume } = scoreTenant(tenant({ recentCaseCount: 0 }), req);
    expect(caseVolume).toBe(-10);
  });

  it("gives 0 caseVolume penalty when case count > 0", () => {
    const { caseVolume } = scoreTenant(tenant({ recentCaseCount: 1 }), req);
    expect(caseVolume).toBe(0);
  });

  it("gives 20 region score when prefecture matches", () => {
    const { regionMatch } = scoreTenant(tenant({ prefecture: "東京都" }), req);
    expect(regionMatch).toBe(20);
  });

  it("gives 0 region score when prefecture differs", () => {
    const { regionMatch } = scoreTenant(tenant({ prefecture: "大阪府" }), req);
    expect(regionMatch).toBe(0);
  });

  it("gives 10 neutral region score when no prefecture required", () => {
    const { regionMatch } = scoreTenant(tenant(), { categories: [], prefecture: null });
    expect(regionMatch).toBe(10);
  });

  it("gives rating score proportional to avg rating", () => {
    const { rating } = scoreTenant(tenant({ avgRating: 5.0 }), req);
    expect(rating).toBe(20); // 5 × 4
  });

  it("gives 10 neutral rating when avgRating is null", () => {
    const { rating } = scoreTenant(tenant({ avgRating: null }), req);
    expect(rating).toBe(10);
  });

  it("total score is never negative", () => {
    const { total } = scoreTenant(
      tenant({
        serviceCategories: [],
        recentCaseCount: 0,
        hasActiveContract: false,
        avgRating: 0,
        prefecture: "北海道",
      }),
      req,
    );
    expect(total).toBeGreaterThanOrEqual(0);
  });
});

describe("rankCandidates", () => {
  it("returns candidates sorted by score descending", () => {
    const candidates = [
      tenant({ tenantId: "low", serviceCategories: ["tint"], hasActiveContract: false, avgRating: 1.0 }),
      tenant({ tenantId: "high", serviceCategories: ["ppf"], hasActiveContract: true, avgRating: 5.0 }),
    ];
    const results = rankCandidates(candidates, req);
    expect(results[0].tenantId).toBe("high");
    expect(results[1].tenantId).toBe("low");
  });

  it("limits results to specified count", () => {
    const candidates = Array.from({ length: 15 }, (_, i) => tenant({ tenantId: `t${i}` }));
    const results = rankCandidates(candidates, req, 5);
    expect(results).toHaveLength(5);
  });

  it("returns empty array for empty candidates", () => {
    expect(rankCandidates([], req)).toHaveLength(0);
  });

  it("all results have null recommendationText initially", () => {
    const results = rankCandidates([tenant()], req);
    expect(results[0].recommendationText).toBeNull();
  });
});
