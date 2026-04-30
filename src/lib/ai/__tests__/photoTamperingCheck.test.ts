import { describe, it, expect } from "vitest";
import { detectExifFlags, type PhotoExifMeta } from "../photoTamperingCheck";

const NOW = new Date("2026-04-30T12:00:00Z");

function meta(over: Partial<PhotoExifMeta> = {}): PhotoExifMeta {
  return {
    takenAt: new Date("2026-04-28T10:00:00Z"),
    latitude: 35.6895,
    longitude: 139.6917,
    deviceModel: "Apple iPhone 15",
    software: null,
    hasExif: true,
    ...over,
  };
}

describe("detectExifFlags", () => {
  it("returns no flags for a clean photo", () => {
    const flags = detectExifFlags(meta(), NOW, [meta()], 0);
    expect(flags).toHaveLength(0);
  });

  it("detects exif_stripped when hasExif is false", () => {
    const flags = detectExifFlags(meta({ hasExif: false }), NOW, [], 0);
    expect(flags).toContain("exif_stripped");
    // other checks should be skipped — only exif_stripped
    expect(flags).toHaveLength(1);
  });

  it("detects software_edited for Photoshop", () => {
    const flags = detectExifFlags(meta({ software: "Adobe Photoshop 25.0" }), NOW, [meta()], 0);
    expect(flags).toContain("software_edited");
  });

  it("detects software_edited for GIMP", () => {
    const flags = detectExifFlags(meta({ software: "GIMP 2.10.36" }), NOW, [meta()], 0);
    expect(flags).toContain("software_edited");
  });

  it("does not flag normal camera software", () => {
    const flags = detectExifFlags(meta({ software: "Camera 5.0" }), NOW, [meta()], 0);
    expect(flags).not.toContain("software_edited");
  });

  it("detects timestamp_future when photo taken after now", () => {
    const future = new Date(NOW.getTime() + 10 * 60 * 1000); // 10 min ahead
    const flags = detectExifFlags(meta({ takenAt: future }), NOW, [meta()], 0);
    expect(flags).toContain("timestamp_future");
  });

  it("allows photos within 2-minute clock skew", () => {
    const almostFuture = new Date(NOW.getTime() + 90 * 1000); // 1.5 min ahead
    const flags = detectExifFlags(meta({ takenAt: almostFuture }), NOW, [meta()], 0);
    expect(flags).not.toContain("timestamp_future");
  });

  it("detects gps_extreme for 0,0 coordinates", () => {
    const flags = detectExifFlags(meta({ latitude: 0, longitude: 0 }), NOW, [meta()], 0);
    expect(flags).toContain("gps_extreme");
  });

  it("detects gps_extreme for polar latitude", () => {
    const flags = detectExifFlags(meta({ latitude: 88, longitude: 10 }), NOW, [meta()], 0);
    expect(flags).toContain("gps_extreme");
  });

  it("detects timestamp_mismatch when two consecutive photos have the same timestamp", () => {
    const t = new Date("2026-04-28T10:00:00Z");
    const metas = [meta({ takenAt: t }), meta({ takenAt: new Date(t.getTime() + 500) })]; // 0.5s
    const flags = detectExifFlags(metas[1], NOW, metas, 1);
    expect(flags).toContain("timestamp_mismatch");
  });

  it("does not flag timestamp when gap is more than 1 second", () => {
    const t = new Date("2026-04-28T10:00:00Z");
    const metas = [meta({ takenAt: t }), meta({ takenAt: new Date(t.getTime() + 2000) })]; // 2s
    const flags = detectExifFlags(metas[1], NOW, metas, 1);
    expect(flags).not.toContain("timestamp_mismatch");
  });

  it("does not check mismatch for first photo (index 0)", () => {
    const flags = detectExifFlags(meta(), NOW, [meta()], 0);
    expect(flags).not.toContain("timestamp_mismatch");
  });
});
