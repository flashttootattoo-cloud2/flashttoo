import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "administradorgeneral") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId, adjustment } = await req.json();
  if (!userId || typeof adjustment !== "number") return NextResponse.json({ error: "Invalid params" }, { status: 400 });

  const clamped = Math.min(20, Math.max(-30, Math.round(adjustment)));

  const service = createServiceClient();
  const { error } = await service
    .from("profiles")
    .update({ trust_score_manual: clamped })
    .eq("id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, trust_score_manual: clamped });
}
