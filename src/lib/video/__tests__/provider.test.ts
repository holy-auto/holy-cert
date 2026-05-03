import { describe, it, expect } from "vitest";
import { getProvider, getDefaultProvider } from "@/lib/video/provider";

describe("getProvider", () => {
  it("returns the cloudflare provider", () => {
    expect(getProvider("cloudflare").name).toBe("cloudflare");
  });
  it("returns the mux provider (skeleton)", () => {
    expect(getProvider("mux").name).toBe("mux");
  });
  it("returns the youtube provider", () => {
    expect(getProvider("youtube").name).toBe("youtube");
  });
  it("returns the external provider", () => {
    expect(getProvider("external").name).toBe("external");
  });
  it("throws on unknown provider name", () => {
    // @ts-expect-error intentional invalid name
    expect(() => getProvider("bogus")).toThrow(/unknown_video_provider/);
  });
});

describe("getDefaultProvider", () => {
  it("falls back to cloudflare when env is unset", () => {
    delete process.env.DEFAULT_VIDEO_PROVIDER;
    expect(getDefaultProvider().name).toBe("cloudflare");
  });
  it("respects DEFAULT_VIDEO_PROVIDER env to enable Mux migration", () => {
    process.env.DEFAULT_VIDEO_PROVIDER = "mux";
    try {
      expect(getDefaultProvider().name).toBe("mux");
    } finally {
      delete process.env.DEFAULT_VIDEO_PROVIDER;
    }
  });
  it("ignores invalid env value", () => {
    process.env.DEFAULT_VIDEO_PROVIDER = "totally-bogus";
    try {
      expect(getDefaultProvider().name).toBe("cloudflare");
    } finally {
      delete process.env.DEFAULT_VIDEO_PROVIDER;
    }
  });
});
