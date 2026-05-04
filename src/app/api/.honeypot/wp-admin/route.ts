import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/lib/rateLimit";
import { createHash } from "node:crypto";

export const runtime = "edge";

/**
 * Honeypot endpoint. Wordpress / phpMyAdmin / .env / .git の探索 bot は
 * 99% 攻撃者なので、ヒットを Sentry にマークしておくと事後分析と
 * 将来の WAF ルール改善に役立つ。
 *
 * 本物のリソースは存在しないため、応答は常に 404 を返す (情報漏洩しない)。
 *
 * Routes mapped (next.config.ts の rewrites で追加):
 *   /wp-admin → /api/.honeypot/wp-admin
 *   /wp-login.php → /api/.honeypot/wp-admin
 *   /.env → /api/.honeypot/wp-admin
 *   /.git/config → /api/.honeypot/wp-admin
 *   /phpmyadmin → /api/.honeypot/wp-admin
 *   /admin.php → /api/.honeypot/wp-admin
 */
export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}

function handle(req: NextRequest) {
  const ip = getClientIp(req);
  const ipHash = createHash("sha256")
    .update(`${process.env.SECURITY_LOG_SALT ?? "ledra-default-salt"}:${ip}`)
    .digest("hex")
    .slice(0, 16);

  // Sentry に "honeypot_hit" を記録 (PII を含めない)
  import("@sentry/nextjs")
    .then((Sentry) => {
      Sentry.withScope((scope) => {
        scope.setTag("security_event", "honeypot_hit");
        scope.setLevel("warning");
        scope.setExtras({
          path: req.nextUrl.pathname,
          method: req.method,
          ip_hash: ipHash,
          user_agent: req.headers.get("user-agent")?.slice(0, 200) ?? null,
          referer: req.headers.get("referer")?.slice(0, 200) ?? null,
        });
        Sentry.captureMessage("security:honeypot_hit", "warning");
      });
    })
    .catch(() => {});

  // 攻撃者に honeypot だと気付かれないよう、本物の 404 と同じ応答を返す。
  return new NextResponse(null, { status: 404 });
}
