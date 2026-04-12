import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: admin } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (admin?.role !== "administradorgeneral") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, brand_name, contact_url, city } = await req.json();
  if (!id || !brand_name) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const service = createServiceClient();
  const { data, error } = await service
    .from("ads")
    .update({ brand_name, contact_url: contact_url || null, city: city || null })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ad: data });
}
