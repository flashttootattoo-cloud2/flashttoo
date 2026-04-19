import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subscription = await req.json();
  if (!subscription?.endpoint) return NextResponse.json({ error: "No endpoint" }, { status: 400 });

  const service = createServiceClient();

  // Load all subscriptions for this user, then delete only the one matching
  // this endpoint in JS — avoids relying on JSONB filter operators in PostgREST
  // which may silently fail and leave stale endpoints that cause 410 errors on send.
  const { data: existing } = await service
    .from("push_subscriptions")
    .select("id, subscription")
    .eq("user_id", user.id);

  const toDelete = (existing ?? [])
    .filter((row) => (row.subscription as { endpoint?: string })?.endpoint === subscription.endpoint)
    .map((row) => row.id as string);

  if (toDelete.length > 0) {
    await service.from("push_subscriptions").delete().in("id", toDelete);
  }

  const { error } = await service.from("push_subscriptions").insert(
    { user_id: user.id, subscription }
  );

  if (error) {
    console.error("[push/subscribe] insert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
