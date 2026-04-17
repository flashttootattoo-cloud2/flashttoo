import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

async function adminGuard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "administradorgeneral") return null;
  return createServiceClient();
}

export async function GET() {
  const service = await adminGuard();
  if (!service) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: raw, error } = await service
    .from("profile_reports")
    .select("id, reason, created_at, reporter_id, reported_id")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const allIds = [...new Set([
    ...(raw ?? []).map((r: { reporter_id: string }) => r.reporter_id),
    ...(raw ?? []).map((r: { reported_id: string }) => r.reported_id),
  ])];

  const { data: profiles } = allIds.length > 0
    ? await service.from("profiles").select("id, full_name, username, avatar_url, is_blocked").in("id", allIds)
    : { data: [] };

  const profileMap = Object.fromEntries((profiles ?? []).map((p: { id: string }) => [p.id, p]));

  const data = (raw ?? []).map((r: { reporter_id: string; reported_id: string; [key: string]: unknown }) => ({
    ...r,
    reporter: profileMap[r.reporter_id] ?? null,
    reported: profileMap[r.reported_id] ?? null,
  }));

  return NextResponse.json({ reports: data });
}

export async function DELETE(req: Request) {
  const service = await adminGuard();
  if (!service) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { reported_id } = await req.json();
  if (!reported_id) return NextResponse.json({ error: "Missing reported_id" }, { status: 400 });

  await service.from("profile_reports").delete().eq("reported_id", reported_id);
  return NextResponse.json({ ok: true });
}
