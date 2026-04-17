import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reported_id, reason } = await req.json();
  if (!reported_id) return NextResponse.json({ error: "Missing reported_id" }, { status: 400 });
  if (reported_id === user.id) return NextResponse.json({ error: "Can't report yourself" }, { status: 400 });

  // Use service client to bypass RLS — ensures the cooldown check always works
  const service = createServiceClient();
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await service
    .from("profile_reports")
    .select("created_at")
    .eq("reporter_id", user.id)
    .eq("reported_id", reported_id)
    .gte("created_at", cutoff)
    .maybeSingle();

  if (existing) {
    const nextAvailable = new Date(new Date(existing.created_at).getTime() + 7 * 24 * 60 * 60 * 1000);
    const daysLeft = Math.ceil((nextAvailable.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return NextResponse.json({ error: `Ya reportaste este perfil. Podés volver a reportarlo en ${daysLeft} día${daysLeft !== 1 ? "s" : ""}.` }, { status: 429 });
  }

  const { error } = await service.from("profile_reports").insert({
    reporter_id: user.id,
    reported_id,
    reason: reason ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
