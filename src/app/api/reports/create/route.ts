import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { design_id, reason } = await req.json();
  if (!design_id) return NextResponse.json({ error: "Missing design_id" }, { status: 400 });

  const { error } = await supabase.from("reports").insert({
    design_id,
    reporter_id: user.id,
    reason: reason ?? null,
  });

  if (error?.code === "23505") {
    // unique violation — already reported
    return NextResponse.json({ ok: true, already: true });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
