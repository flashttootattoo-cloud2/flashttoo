import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subscription = await req.json();
  if (!subscription?.endpoint) return NextResponse.json({ error: "No endpoint" }, { status: 400 });

  // Upsert by endpoint — one row per device, many per user
  // endpoint is a GENERATED column so we don't pass it — Postgres computes it from subscription
  await supabase.from("push_subscriptions").upsert(
    { user_id: user.id, subscription },
    { onConflict: "endpoint" }
  );

  return NextResponse.json({ ok: true });
}
