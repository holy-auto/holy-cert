import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

// Backward-compatible lazy singleton (avoids build-time crash when env vars are missing)
let _adminInstance: ReturnType<typeof createAdminClient> | null = null;
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createAdminClient>, {
  get(_target, prop, receiver) {
    if (!_adminInstance) _adminInstance = createAdminClient();
    return Reflect.get(_adminInstance, prop, receiver);
  },
});
