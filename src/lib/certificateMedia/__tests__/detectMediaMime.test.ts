import { describe, it, expect } from "vitest";
import {
  detectMediaMime,
  extensionForMime,
  ALLOWED_VIDEO_MIME,
  ALLOWED_IMAGE_MIME,
  SUPPORTED_MEDIA_TYPES,
} from "@/lib/certificateMedia";

describe("detectMediaMime", () => {
  it("detects JPEG by magic bytes", () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(detectMediaMime(buf)).toBe("image/jpeg");
  });

  it("detects PNG by full 8-byte signature", () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    expect(detectMediaMime(buf)).toBe("image/png");
  });

  it("rejects PNG-like prefix without full 8-byte signature", () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0xff, 0xff, 0xff, 0xff, 0, 0, 0, 0]);
    expect(detectMediaMime(buf)).toBeNull();
  });

  it("detects MP4 with brand 'isom'", () => {
    const buf = Buffer.alloc(12);
    buf.write("ftyp", 4, "ascii");
    buf.write("isom", 8, "ascii");
    expect(detectMediaMime(buf)).toBe("video/mp4");
  });

  it("detects MP4 with brand 'mp42'", () => {
    const buf = Buffer.alloc(12);
    buf.write("ftyp", 4, "ascii");
    buf.write("mp42", 8, "ascii");
    expect(detectMediaMime(buf)).toBe("video/mp4");
  });

  it("detects MP4 with brand 'iso5'", () => {
    const buf = Buffer.alloc(12);
    buf.write("ftyp", 4, "ascii");
    buf.write("iso5", 8, "ascii");
    expect(detectMediaMime(buf)).toBe("video/mp4");
  });

  it("detects MOV (QuickTime) with brand 'qt  '", () => {
    const buf = Buffer.alloc(12);
    buf.write("ftyp", 4, "ascii");
    buf.write("qt  ", 8, "ascii");
    expect(detectMediaMime(buf)).toBe("video/quicktime");
  });

  it("rejects WebP (we only allow JPEG/PNG for media images)", () => {
    const buf = Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    expect(detectMediaMime(buf)).toBeNull();
  });

  it("rejects ftyp with unknown brand", () => {
    const buf = Buffer.alloc(12);
    buf.write("ftyp", 4, "ascii");
    buf.write("xxxx", 8, "ascii");
    expect(detectMediaMime(buf)).toBeNull();
  });

  it("rejects empty buffer", () => {
    expect(detectMediaMime(Buffer.alloc(0))).toBeNull();
  });

  it("rejects under-12-byte buffer", () => {
    expect(detectMediaMime(Buffer.alloc(11, 0xff))).toBeNull();
  });

  it("rejects fake video MIME (Windows PE header)", () => {
    const buf = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00]);
    expect(detectMediaMime(buf)).toBeNull();
  });
});

describe("extensionForMime", () => {
  it("maps known mimes to extensions", () => {
    expect(extensionForMime("image/jpeg")).toBe("jpg");
    expect(extensionForMime("image/png")).toBe("png");
    expect(extensionForMime("video/mp4")).toBe("mp4");
    expect(extensionForMime("video/quicktime")).toBe("mov");
  });

  it("falls back to 'bin' for unknown mime", () => {
    expect(extensionForMime("application/octet-stream")).toBe("bin");
  });
});

describe("constants are aligned with DB CHECK and route validation", () => {
  it("SUPPORTED_MEDIA_TYPES does not include panorama360 (initial release scope)", () => {
    expect(SUPPORTED_MEDIA_TYPES).toContain("video");
    expect(SUPPORTED_MEDIA_TYPES).toContain("before_after");
    expect(SUPPORTED_MEDIA_TYPES).not.toContain("panorama360");
  });

  it("ALLOWED_VIDEO_MIME and ALLOWED_IMAGE_MIME are mutually exclusive", () => {
    const videos = new Set<string>(ALLOWED_VIDEO_MIME);
    for (const m of ALLOWED_IMAGE_MIME) {
      expect(videos.has(m)).toBe(false);
    }
  });

  it("only allows MP4 and QuickTime as video MIMEs (no AVI/WebM/MKV in v1)", () => {
    expect([...ALLOWED_VIDEO_MIME].sort()).toEqual(["video/mp4", "video/quicktime"]);
  });

  it("only allows JPEG and PNG as image MIMEs (Before/After + poster)", () => {
    expect([...ALLOWED_IMAGE_MIME].sort()).toEqual(["image/jpeg", "image/png"]);
  });
});
