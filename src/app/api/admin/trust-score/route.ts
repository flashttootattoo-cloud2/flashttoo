import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "administradorgeneral") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { userId, adjustment, is_verified } = body;
  if (!userId) return NextResponse.json({ error: "Invalid params" }, { status: 400 });

  const service = createServiceClient();
  const updates: Record<string, unknown> = {};

  if (typeof adjustment === "number") {
    updates.trust_score_manual = Math.min(100, Math.max(-100, Math.round(adjustment)));
  }
  if (typeof is_verified === "boolean") {
    updates.is_verified = is_verified;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await service.from("profiles").update(updates).eq("id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, ...updates });
}
