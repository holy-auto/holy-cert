import crypto from "crypto";

/**
 * Verify a cron request is authorized.
 *
 * Checks in order:
 * 1. Vercel cron signature (`x-vercel-cron-signature` header) — verified via
 *    HMAC-SHA256 of the request body using CRON_SECRET as the key.
 * 2. Bearer token in the `Authorization` header matching CRON_SECRET —
 *    works both for Vercel's built-in cron auth and local development.
 */
export function verifyCronRequest(req: Request): {
  authorized: boolean;
  error?: string;
} {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return { authorized: false, error: "CRON_SECRET is not configured" };
  }

  // 1. Check Vercel cron signature header
  const vercelSignature = req.headers.get("x-vercel-cron-signature");
  if (vercelSignature) {
    const expected = crypto.createHmac("sha256", cronSecret)
      .update("")
      .digest("hex");
    if (
      vercelSignature.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(vercelSignature), Buffer.from(expected))
    ) {
      return { authorized: true };
    }
    // Signature present but invalid — reject immediately
    return { authorized: false, error: "Invalid Vercel cron signature" };
  }

  // 2. Fallback: Bearer token check (Vercel built-in + local dev)
  const authHeader = req.headers.get("authorization");
  const expectedBearer = `Bearer ${cronSecret}`;
  if (
    authHeader &&
    authHeader.length === expectedBearer.length &&
    crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(expectedBearer))
  ) {
    return { authorized: true };
  }

  return { authorized: false, error: "Missing or invalid authorization" };
}
