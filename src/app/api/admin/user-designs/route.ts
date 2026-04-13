import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: admin } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (admin?.role !== "administradorgeneral") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ designs: [] });

  const service = createServiceClient();
  const { data: designs } = await service
    .from("designs")
    .select("id, title, image_url, is_available, is_archived, is_admin_hidden")
    .eq("artist_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);

  return NextResponse.json({ designs: designs ?? [] });
}
