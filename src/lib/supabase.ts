import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseAnon = createClient(url, anon, {
  auth: { persistSession: false },
});

/** @deprecated Use getSupabaseAdmin() from "@/lib/supabase/admin" instead */
export const supabaseService = getSupabaseAdmin();
