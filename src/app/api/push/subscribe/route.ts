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

  // Delete all existing subscriptions for this user first — avoids stale
  // entries from old VAPID keys piling up and causing 410s on send.
  await service.from("push_subscriptions").delete().eq("user_id", user.id);

  const { error } = await service.from("push_subscriptions").insert(
    { user_id: user.id, subscription }
  );

  if (error) {
    console.error("[push/subscribe] insert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
