/**
 * GET /api/marketing/resources/all/zip
 *
 * Streams every registered marketing PDF in `RESOURCE_PDFS` bundled as
 * a single ZIP. Mirrors the rate-limit and lead-id writeback behavior
 * of the per-resource route under `[key]/pdf`.
 *
 * Rate limited more aggressively than single-PDF downloads because each
 * call renders all PDFs (CPU-bound).
 */

import { NextRequest, NextResponse } from "next/server";
import { apiInternalError } from "@/lib/api/response";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { markLeadDownloaded } from "@/lib/marketing/leads";
import { RESOURCE_BUNDLE_FILENAME, renderResourceBundle } from "@/lib/marketing/resourceBundle";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await checkRateLimit(`marketing-resource-bundle:${ip}`, {
    limit: 5,
    windowSec: 900,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "ダウンロードが多すぎます。しばらくしてから再度お試しください。",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfterSec),
        },
      },
    );
  }

  try {
    const buffer = await renderResourceBundle();

    // Optional `?lead=<uuid>` lets the card pair a download with the lead
    // it came from. Fire-and-forget — never block on analytics.
    const leadId = new URL(request.url).searchParams.get("lead");
    if (leadId) {
      markLeadDownloaded(leadId).catch((err) => {
        console.error("[resource bundle] markLeadDownloaded failed:", err);
      });
    }

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${RESOURCE_BUNDLE_FILENAME}"`,
        "Cache-Control": "public, max-age=600, stale-while-revalidate=3600",
      },
    });
  } catch (err) {
    return apiInternalError(err, "resource bundle zip");
  }
}
