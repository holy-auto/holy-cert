import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_STARTER",
  "STRIPE_PRICE_STANDARD",
  "STRIPE_PRICE_PRO",
  "STRIPE_PRICE_STARTER_ANNUAL",
  "STRIPE_PRICE_STANDARD_ANNUAL",
  "STRIPE_PRICE_PRO_ANNUAL",
  "RESEND_API_KEY",
  "CRON_SECRET",
] as const;

export async function GET() {
  const ts = new Date().toISOString();

  // 1. Check required environment variables
  const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);

  // 2. Check Supabase DB connectivity
  let dbOk = false;
  let dbError: string | undefined;
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("tenants").select("id").limit(1);
    if (error) {
      dbError = error.message;
    } else {
      dbOk = true;
    }
  } catch (e) {
    dbError = e instanceof Error ? e.message : "Unknown error";
  }

  const ok = missingEnv.length === 0 && dbOk;

  return NextResponse.json(
    {
      ok,
      ts,
      db: dbOk ? "connected" : dbError,
      env: missingEnv.length === 0 ? "all_set" : { missing: missingEnv },
    },
    { status: ok ? 200 : 503 },
  );
}
