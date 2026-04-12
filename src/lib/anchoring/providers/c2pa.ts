/**
 * C2PA content-provenance signing provider.
 *
 * Env: `C2PA_MODE` = "disabled" | "dev-signed" | "production"
 * Default: "disabled"
 *
 * - `disabled`: no-op, returns unsigned defaults.
 * - `dev-signed`: signs with an ephemeral self-signed ES256 cert (zero config).
 * - `production`: signs with cert/key from C2PA_SIGNER_CERT / C2PA_SIGNER_KEY env vars.
 *
 * The native @contentauth/c2pa-node module is loaded dynamically so a
 * binding failure on an unsupported platform falls back gracefully.
 */

import type { C2paResult } from "./types";

export type C2paMode = "disabled" | "dev-signed" | "production";

function getMode(): C2paMode {
  const raw = process.env.C2PA_MODE;
  if (raw === "dev-signed" || raw === "production") return raw;
  return "disabled";
}

const DISABLED_RESULT: C2paResult = {
  manifestCid: null,
  verified: false,
  signedBuffer: null,
};

/**
 * Sign an image buffer with a C2PA manifest.
 *
 * On success the returned `signedBuffer` contains the image with the
 * manifest embedded.  The caller should upload this buffer to storage
 * instead of the original.
 */
export async function signC2pa(buffer: Buffer, mime: string): Promise<C2paResult> {
  const mode = getMode();
  if (mode === "disabled") return DISABLED_RESULT;

  try {
    const { createC2paSigner } = await import("./c2paSigner");
    const signer = await createC2paSigner(mode);
    if (!signer) return DISABLED_RESULT;

    const { Builder } = await import("@contentauth/c2pa-node");

    const builder = new Builder({
      claim_generator: "Ledra/1.0",
      title: "Certificate Photo",
    });

    builder.addAssertion("c2pa.actions", {
      actions: [{ action: "c2pa.created" }],
    });

    const input = { buffer, mimeType: mime };
    const output: { buffer: Buffer | null } = { buffer: null };

    builder.sign(signer, input, output);

    if (!output.buffer) {
      console.error("[c2pa] signing produced no output buffer");
      return DISABLED_RESULT;
    }

    return {
      manifestCid: null, // IPFS pinning deferred to future phase
      verified: true,
      signedBuffer: output.buffer,
    };
  } catch (err) {
    console.error("[c2pa] signing failed, falling back to unsigned", err);
    return DISABLED_RESULT;
  }
}
