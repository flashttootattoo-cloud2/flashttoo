import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subscription = await req.json();

  // Upsert: one subscription per user (replace on conflict)
  await supabase.from("push_subscriptions").upsert(
    { user_id: user.id, subscription },
    { onConflict: "user_id" }
  );

  return NextResponse.json({ ok: true });
}
