/**
 * Tests for generateImageVariants + variantStoragePath.
 *
 * The sharp pipeline is exercised end-to-end on a small in-memory PNG —
 * fast enough for unit tests, and validates that the actual encoder
 * produces the expected WebP output sizes.
 */
import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { generateImageVariants, variantStoragePath } from "@/lib/certificateImages/generateVariants";

/** Build a 2000x1500 PNG so the resize step has work to do for both variants. */
async function makeSourcePng(width = 2000, height = 1500): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 30, g: 90, b: 180 },
    },
  })
    .png()
    .toBuffer();
}

describe("generateImageVariants", () => {
  it("produces a thumbnail (≤400px wide) and a medium (≤1200px wide), both WebP", async () => {
    const src = await makeSourcePng();
    const { thumbnail, medium } = await generateImageVariants(src);

    expect(thumbnail).not.toBeNull();
    expect(medium).not.toBeNull();

    expect(thumbnail!.contentType).toBe("image/webp");
    expect(thumbnail!.width).toBeLessThanOrEqual(400);
    expect(thumbnail!.byteLength).toBeGreaterThan(0);

    expect(medium!.contentType).toBe("image/webp");
    expect(medium!.width).toBeLessThanOrEqual(1200);
    expect(medium!.byteLength).toBeGreaterThan(0);

    // Thumbnail should be smaller than the medium for any non-trivial image.
    expect(thumbnail!.byteLength).toBeLessThan(medium!.byteLength);
  });

  it("does NOT enlarge an already-small source (keeps original dimensions)", async () => {
    const src = await makeSourcePng(200, 150);
    const { thumbnail, medium } = await generateImageVariants(src);

    expect(thumbnail!.width).toBe(200);
    expect(medium!.width).toBe(200);
  });

  it("returns nulls when sharp cannot decode the buffer (no throw)", async () => {
    const garbage = Buffer.from("not actually an image");
    const { thumbnail, medium } = await generateImageVariants(garbage);

    expect(thumbnail).toBeNull();
    expect(medium).toBeNull();
  });
});

describe("variantStoragePath", () => {
  it("inserts the variant suffix before the final extension", () => {
    expect(variantStoragePath("tenant/cert/12345_0.jpg", "thumbnail")).toBe("tenant/cert/12345_0.thumb.webp");
    expect(variantStoragePath("tenant/cert/12345_0.png", "medium")).toBe("tenant/cert/12345_0.md.webp");
  });

  it("handles paths with no extension", () => {
    expect(variantStoragePath("tenant/cert/raw", "thumbnail")).toBe("tenant/cert/raw.thumb.webp");
  });

  it("only strips the LAST dot (keeps directory dots intact)", () => {
    // Hypothetical path with a dot in the directory — must not consume it.
    expect(variantStoragePath("v.1/cert/12345_0.jpg", "medium")).toBe("v.1/cert/12345_0.md.webp");
  });
});
