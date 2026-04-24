import { describe, it, expect } from "vitest";
import { isValidElement } from "react";
import { RESOURCE_PDFS } from "../resourcePdf";

describe("RESOURCE_PDFS", () => {
  it("exposes the 6 homepage resources", () => {
    expect(Object.keys(RESOURCE_PDFS).sort()).toEqual(
      [
        "case-studies",
        "features-deep-dive",
        "pricing-overview",
        "roi-template",
        "security-whitepaper",
        "service-overview",
      ].sort(),
    );
  });

  it("every entry has a .pdf filename and a valid React Document factory", async () => {
    for (const [key, entry] of Object.entries(RESOURCE_PDFS)) {
      expect(entry.filename, `${key}.filename`).toMatch(/\.pdf$/);
      const doc = await entry.doc();
      expect(isValidElement(doc), `${key}.doc() returns a React element`).toBe(true);
    }
  });
});
