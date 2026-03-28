import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Validate redirect path to prevent open redirect attacks */
function safeNextPath(value: string | undefined | null): string {
  if (!value) return "/";
  // Only allow relative paths starting with /
  if (!value.startsWith("/")) return "/";
  // Block protocol-relative URLs (//evil.com)
  if (value.startsWith("//")) return "/";
  return value;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/insurer/login?error=missing_code", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL(`/insurer/login?error=${encodeURIComponent(error.message)}`, url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
