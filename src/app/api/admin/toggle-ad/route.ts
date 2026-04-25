import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: admin } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!["administradorgeneral", "publicistaflashttoo"].includes(admin?.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, is_active } = await req.json();
  const service = createServiceClient();
  const { error } = await service.from("ads").update({ is_active }).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
