import { describe, it, expect } from "vitest";
import { buildMonthlySummaryEmail } from "../monthlySummaryEmail";

const base = {
  manufacturerName: "デモコーティング工業",
  monthLabel: "2026年4月",
  certificatesIssued: 42,
  newCertifications: 3,
  revokedCertifications: 1,
  activeCertifiedTenants: 18,
  qualityFlaggedCount: 0,
  portalUrl: "https://app.ledra.co.jp/manufacturer",
};

describe("buildMonthlySummaryEmail", () => {
  it("includes manufacturer name and month in subject", () => {
    const { subject } = buildMonthlySummaryEmail(base);
    expect(subject).toContain("デモコーティング工業");
    expect(subject).toContain("2026年4月");
  });

  it("renders all KPI values", () => {
    const { html } = buildMonthlySummaryEmail(base);
    expect(html).toContain("42");
    expect(html).toContain("18");
    expect(html).toContain("メーカーポータルを開く");
  });

  it("shows positive quality message when no flags", () => {
    const { html } = buildMonthlySummaryEmail(base);
    expect(html).toContain("すべて品質基準を満たしています");
  });

  it("shows warning when quality flags present", () => {
    const { html } = buildMonthlySummaryEmail({ ...base, qualityFlaggedCount: 5 });
    expect(html).toContain("5 件が品質基準");
  });

  it("escapes HTML in manufacturer name to prevent injection", () => {
    const { html, subject } = buildMonthlySummaryEmail({
      ...base,
      manufacturerName: '<script>alert("x")</script>',
    });
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
    // Subject is plain text (not HTML context) so raw is acceptable there.
    expect(subject).toContain("<script>");
  });
});
