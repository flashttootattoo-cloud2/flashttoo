import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: admin } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (admin?.role !== "administradorgeneral") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const service = createServiceClient();

  // Fetch reports, then manually join profiles (reporter_id → auth.users → profiles)
  const { data: rawReports, error } = await service
    .from("reports")
    .select(`
      id,
      reason,
      created_at,
      reporter_id,
      design_id,
      design:designs(
        id, title, image_url, is_admin_hidden,
        artist:profiles!designs_artist_id_fkey(full_name, username)
      )
    `)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch reporter profiles separately
  const reporterIds = [...new Set((rawReports ?? []).map((r: { reporter_id: string }) => r.reporter_id))];
  const { data: reporterProfiles } = reporterIds.length > 0
    ? await service.from("profiles").select("id, full_name, username").in("id", reporterIds)
    : { data: [] };

  const profileMap = Object.fromEntries((reporterProfiles ?? []).map((p: { id: string; full_name: string; username: string }) => [p.id, p]));

  const data = (rawReports ?? []).map((r: { reporter_id: string; [key: string]: unknown }) => ({
    ...r,
    reporter: profileMap[r.reporter_id] ?? null,
  }));

  return NextResponse.json({ reports: data ?? [] });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: admin } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (admin?.role !== "administradorgeneral") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { design_id } = await req.json();
  const service = createServiceClient();
  await service.from("reports").delete().eq("design_id", design_id);

  return NextResponse.json({ ok: true });
}
