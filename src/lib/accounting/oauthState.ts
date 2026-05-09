import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const DEFAULT_TTL_SECONDS = 10 * 60;

type OAuthStatePayload = {
  tenantId: string;
  provider: string;
  nonce: string;
  exp: number;
};

function getStateSecret(): string {
  return process.env.ACCOUNTING_OAUTH_STATE_SECRET ?? process.env.FREEE_CLIENT_SECRET ?? "";
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createOAuthState({ tenantId, provider, ttlSeconds = DEFAULT_TTL_SECONDS }: { tenantId: string; provider: string; ttlSeconds?: number }): string {
  const secret = getStateSecret();
  if (!secret) throw new Error("Missing env: ACCOUNTING_OAUTH_STATE_SECRET (or FREEE_CLIENT_SECRET fallback)");

  const payloadObj: OAuthStatePayload = {
    tenantId,
    provider,
    nonce: randomBytes(16).toString("base64url"),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };

  const payload = Buffer.from(JSON.stringify(payloadObj), "utf8").toString("base64url");
  const sig = signPayload(payload, secret);
  return `${payload}.${sig}`;
}

export function verifyOAuthState({ state, provider }: { state: string; provider: string }): { ok: true; tenantId: string } | { ok: false; reason: string } {
  const secret = getStateSecret();
  if (!secret) return { ok: false, reason: "missing_secret" };

  const [payload, sig] = state.split(".");
  if (!payload || !sig) return { ok: false, reason: "malformed" };

  const expectedSig = signPayload(payload, secret);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return { ok: false, reason: "bad_signature" };
  }

  let parsed: OAuthStatePayload;
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OAuthStatePayload;
  } catch {
    return { ok: false, reason: "bad_payload" };
  }

  if (!parsed.tenantId || !parsed.provider || !parsed.nonce || !parsed.exp) return { ok: false, reason: "incomplete_payload" };
  if (parsed.provider !== provider) return { ok: false, reason: "provider_mismatch" };
  if (parsed.exp < Math.floor(Date.now() / 1000)) return { ok: false, reason: "expired" };

  return { ok: true, tenantId: parsed.tenantId };
}
