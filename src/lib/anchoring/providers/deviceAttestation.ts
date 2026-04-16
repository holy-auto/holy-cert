/**
 * Device attestation provider (Play Integrity / App Attest).
 *
 * Env: `DEVICE_ATTESTATION_ENABLED` = "true" | "false"
 * Default: "false"
 *
 * Phase 3a: stub only — always returns unverified.
 * Phase 3d: validates Play Integrity / App Attest tokens.
 */

import type { DeviceAttestationResult } from "./types";

function isEnabled(): boolean {
  return process.env.DEVICE_ATTESTATION_ENABLED === "true";
}

const DISABLED_RESULT: DeviceAttestationResult = {
  provider: "none",
  verified: false,
};

/**
 * Verify a device attestation token from the client.
 *
 * @param token - The attestation token sent by the mobile client (optional).
 * @returns DeviceAttestationResult with provider and verified status.
 */
export async function verifyDeviceAttestation(token?: string): Promise<DeviceAttestationResult> {
  if (!isEnabled() || !token) return DISABLED_RESULT;

  // Phase 3d: implement Play Integrity / App Attest validation here
  console.warn("[device-attestation] not yet implemented, skipping");
  return DISABLED_RESULT;
}
