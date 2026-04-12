import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service role client — bypasses RLS, solo usar en rutas de servidor
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
