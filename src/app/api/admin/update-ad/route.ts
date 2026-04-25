import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: admin } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!["administradorgeneral", "publicistaflashttoo"].includes(admin?.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, brand_name, contact_url, city, duration_days } = await req.json();
  if (!id || !brand_name) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const service = createServiceClient();

  // If duration_days provided, extend from current expires_at (or now if none)
  let expires_at: string | undefined = undefined;
  if (duration_days) {
    const { data: current } = await service.from("ads").select("expires_at").eq("id", id).single();
    const base = current?.expires_at && new Date(current.expires_at) > new Date()
      ? new Date(current.expires_at)
      : new Date();
    base.setDate(base.getDate() + duration_days);
    expires_at = base.toISOString();
  }

  const { data, error } = await service
    .from("ads")
    .update({ brand_name, contact_url: contact_url || null, city: city || null, ...(expires_at ? { expires_at } : {}) })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ad: data });
}
