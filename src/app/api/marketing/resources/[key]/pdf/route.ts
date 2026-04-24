/**
 * GET /api/marketing/resources/[key]/pdf
 *
 * Streams a generated PDF for the requested marketing resource. The set of
 * available resources is registered in `src/lib/marketing/resourcePdf.tsx`.
 * Resources not present in the registry return 404.
 *
 * Rate limited: each client IP may pull up to 20 PDFs per 15-minute window.
 * PDF generation is CPU-bound (server-side react-pdf render with embedded
 * fonts) so unbounded traffic would be a trivial DoS vector.
 */

import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { apiNotFound, apiInternalError } from "@/lib/api/response";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { markLeadDownloaded } from "@/lib/marketing/leads";
import { RESOURCE_PDFS } from "@/lib/marketing/resourcePdf";

export const runtime = "nodejs";

export async function GET(request: Request, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  const entry = RESOURCE_PDFS[key];
  if (!entry) {
    return apiNotFound("Unknown resource key");
  }

  const ip = getClientIp(request);
  const rl = await checkRateLimit(`marketing-resource-pdf:${ip}`, {
    limit: 20,
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
    // `entry.doc` may be async (e.g. case-studies loads MDX entries).
    const docElement = await entry.doc();
    const buffer = await renderToBuffer(docElement);

    // Optional `?lead=<uuid>` lets the card pair a download with the lead
    // it came from, giving us the actual completion rate in the DB.
    // Fire-and-forget: the user's download must not wait on analytics.
    const leadId = new URL(request.url).searchParams.get("lead");
    if (leadId) {
      markLeadDownloaded(leadId).catch((err) => {
        console.error("[resource pdf] markLeadDownloaded failed:", err);
      });
    }

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${entry.filename}"`,
        "Cache-Control": "public, max-age=600, stale-while-revalidate=3600",
      },
    });
  } catch (err) {
    return apiInternalError(err, `resource pdf ${key}`);
  }
}
