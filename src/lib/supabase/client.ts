import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      realtime: {
        // Disable the external worker fetch (realtime.supabase.com/worker.js)
        // to avoid "Failed to fetch" errors when that CDN is unreachable
        worker: false,
      },
    }
  );
}
