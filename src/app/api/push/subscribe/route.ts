import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subscription = await req.json();
  const endpoint = subscription?.endpoint;
  if (!endpoint) return NextResponse.json({ error: "No endpoint" }, { status: 400 });

  // Upsert by endpoint — one row per device, many per user
  await supabase.from("push_subscriptions").upsert(
    { user_id: user.id, subscription, endpoint },
    { onConflict: "endpoint" }
  );

  return NextResponse.json({ ok: true });
}
