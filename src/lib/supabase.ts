import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _anon: SupabaseClient | null = null;
export function getSupabaseAnon(): SupabaseClient {
  if (!_anon) {
    _anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );
  }
  return _anon;
}

let _service: SupabaseClient | null = null;
export function getSupabaseService(): SupabaseClient {
  if (!_service) {
    _service = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
  }
  return _service;
}

// Backward-compatible lazy singletons
export const supabaseAnon: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, p, r) { return Reflect.get(getSupabaseAnon(), p, r); },
});
export const supabaseService: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, p, r) { return Reflect.get(getSupabaseService(), p, r); },
});
