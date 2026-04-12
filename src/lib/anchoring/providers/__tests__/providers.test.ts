import { describe, it, expect, vi, beforeEach } from "vitest";

// Dynamically import so env vars take effect per-test
async function loadProviders() {
  // Clear module cache to pick up env changes
  vi.resetModules();
  return import("../index");
}

async function loadGrade() {
  vi.resetModules();
  return import("../../authenticityGrade");
}

describe("invokeAllUploadProviders", () => {
  const dummyBuffer = Buffer.from("test-image-data");

  beforeEach(() => {
    // Reset all provider env vars to disabled
    delete process.env.C2PA_MODE;
    delete process.env.DEEPFAKE_PROVIDER;
    delete process.env.DEVICE_ATTESTATION_ENABLED;
    delete process.env.POLYGON_ANCHOR_ENABLED;
  });

  it("returns safe defaults when all providers are disabled", async () => {
    const { invokeAllUploadProviders } = await loadProviders();
    const result = await invokeAllUploadProviders(dummyBuffer, "image/jpeg", "abc123");

    expect(result.c2pa).toEqual({ manifestCid: null, verified: false, signedBuffer: null });
    expect(result.deepfake).toEqual({ score: null, verdict: null });
    expect(result.deviceAttestation).toEqual({ provider: "none", verified: false });
    expect(result.polygon).toEqual({ txHash: null, anchored: false });
  });

  it("falls back gracefully when c2pa signing fails on non-JPEG buffer", async () => {
    process.env.C2PA_MODE = "dev-signed";
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    const { invokeAllUploadProviders } = await loadProviders();
    // dummyBuffer is not a valid JPEG, so c2pa-node will fail
    const result = await invokeAllUploadProviders(dummyBuffer, "image/jpeg", "abc123");

    // Should fall back to disabled result, not throw
    expect(result.c2pa.verified).toBe(false);
    expect(result.c2pa.signedBuffer).toBeNull();

    errorSpy.mockRestore();
    infoSpy.mockRestore();
  });

  it("returns disabled deepfake result when HIVE_API_KEY is missing", async () => {
    process.env.DEEPFAKE_PROVIDER = "hive";
    delete process.env.HIVE_API_KEY;
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { invokeAllUploadProviders } = await loadProviders();
    const result = await invokeAllUploadProviders(dummyBuffer, "image/jpeg", "abc123");

    expect(result.deepfake).toEqual({ score: null, verdict: null });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("[deepfake] HIVE_API_KEY not set"));

    warnSpy.mockRestore();
  });
});

describe("signC2pa directly", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.C2PA_MODE;
  });

  it("returns disabled result when C2PA_MODE is unset", async () => {
    const { signC2pa } = await (async () => {
      vi.resetModules();
      return import("../c2pa");
    })();

    const result = await signC2pa(Buffer.from("test"), "image/jpeg");
    expect(result).toEqual({ manifestCid: null, verified: false, signedBuffer: null });
  });

  it("returns disabled result when C2PA_MODE is disabled", async () => {
    process.env.C2PA_MODE = "disabled";
    const { signC2pa } = await (async () => {
      vi.resetModules();
      return import("../c2pa");
    })();

    const result = await signC2pa(Buffer.from("test"), "image/jpeg");
    expect(result).toEqual({ manifestCid: null, verified: false, signedBuffer: null });
  });
});

describe("computeAuthenticityGrade with c2paKind", () => {
  it("returns basic when c2paKind is dev-signed even if hasC2pa is true", async () => {
    const { computeAuthenticityGrade } = await loadGrade();

    const grade = computeAuthenticityGrade({
      hasSha256: true,
      hasExif: true,
      hasC2pa: true,
      c2paKind: "dev-signed",
      deviceOk: true,
      deepfakeOk: true,
    });

    expect(grade).toBe("basic");
  });

  it("returns verified when c2paKind is production with C2PA + device OK", async () => {
    const { computeAuthenticityGrade } = await loadGrade();

    const grade = computeAuthenticityGrade({
      hasSha256: true,
      hasExif: true,
      hasC2pa: true,
      c2paKind: "production",
      deviceOk: true,
      deepfakeOk: null,
    });

    expect(grade).toBe("verified");
  });

  it("returns premium with production C2PA + device OK + deepfake OK", async () => {
    const { computeAuthenticityGrade } = await loadGrade();

    const grade = computeAuthenticityGrade({
      hasSha256: true,
      hasExif: true,
      hasC2pa: true,
      c2paKind: "production",
      deviceOk: true,
      deepfakeOk: true,
    });

    expect(grade).toBe("premium");
  });

  it("returns basic when c2paKind is omitted (backward compat)", async () => {
    const { computeAuthenticityGrade } = await loadGrade();

    const grade = computeAuthenticityGrade({
      hasSha256: true,
      hasExif: true,
      hasC2pa: false,
      deviceOk: false,
      deepfakeOk: null,
    });

    expect(grade).toBe("basic");
  });
});

describe("checkDeepfake", () => {
  const dummyBuffer = Buffer.from("test-image-data");

  beforeEach(() => {
    vi.resetModules();
    delete process.env.DEEPFAKE_PROVIDER;
    delete process.env.HIVE_API_KEY;
  });

  it("returns disabled result when DEEPFAKE_PROVIDER is unset", async () => {
    const { checkDeepfake } = await (async () => {
      vi.resetModules();
      return import("../deepfake");
    })();

    const result = await checkDeepfake(dummyBuffer);
    expect(result).toEqual({ score: null, verdict: null });
  });

  it("returns disabled result when DEEPFAKE_PROVIDER is disabled", async () => {
    process.env.DEEPFAKE_PROVIDER = "disabled";
    const { checkDeepfake } = await (async () => {
      vi.resetModules();
      return import("../deepfake");
    })();

    const result = await checkDeepfake(dummyBuffer);
    expect(result).toEqual({ score: null, verdict: null });
  });

  it("returns disabled result when provider=hive but HIVE_API_KEY missing", async () => {
    process.env.DEEPFAKE_PROVIDER = "hive";
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { checkDeepfake } = await (async () => {
      vi.resetModules();
      return import("../deepfake");
    })();

    const result = await checkDeepfake(dummyBuffer);
    expect(result).toEqual({ score: null, verdict: null });
    expect(warnSpy).toHaveBeenCalledWith("[deepfake] HIVE_API_KEY not set, skipping");

    warnSpy.mockRestore();
  });

  it("warns for unimplemented sensity provider", async () => {
    process.env.DEEPFAKE_PROVIDER = "sensity";
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { checkDeepfake } = await (async () => {
      vi.resetModules();
      return import("../deepfake");
    })();

    const result = await checkDeepfake(dummyBuffer);
    expect(result).toEqual({ score: null, verdict: null });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("sensity"));

    warnSpy.mockRestore();
  });
});

describe("anchorToPolygon", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.POLYGON_ANCHOR_ENABLED;
    delete process.env.POLYGON_RPC_URL;
    delete process.env.POLYGON_PRIVATE_KEY;
    delete process.env.POLYGON_CONTRACT_ADDRESS;
  });

  it("returns disabled result when POLYGON_ANCHOR_ENABLED is unset", async () => {
    const { anchorToPolygon } = await (async () => {
      vi.resetModules();
      return import("../polygon");
    })();

    const result = await anchorToPolygon("abc123");
    expect(result).toEqual({ txHash: null, anchored: false });
  });

  it("returns disabled result when enabled but env vars missing", async () => {
    process.env.POLYGON_ANCHOR_ENABLED = "true";
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { anchorToPolygon } = await (async () => {
      vi.resetModules();
      return import("../polygon");
    })();

    const result = await anchorToPolygon("abc123");
    expect(result).toEqual({ txHash: null, anchored: false });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("missing POLYGON_RPC_URL"),
    );

    warnSpy.mockRestore();
  });
});

describe("signC2pa IPFS pinning", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.C2PA_MODE;
    delete process.env.PINATA_JWT;
  });

  it("returns null manifestCid when PINATA_JWT is unset", async () => {
    process.env.C2PA_MODE = "disabled";
    const { signC2pa } = await (async () => {
      vi.resetModules();
      return import("../c2pa");
    })();

    const result = await signC2pa(Buffer.from("test"), "image/jpeg");
    expect(result.manifestCid).toBeNull();
  });
});
