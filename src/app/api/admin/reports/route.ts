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

  // Group reports by design, count reporters
  const { data, error } = await service
    .from("reports")
    .select(`
      id,
      reason,
      created_at,
      design:designs!reports_design_id_fkey(
        id, title, image_url, is_admin_hidden,
        artist:profiles!designs_artist_id_fkey(full_name, username)
      ),
      reporter:profiles!reports_reporter_id_fkey(full_name, username)
    `)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
