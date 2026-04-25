import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: admin } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!["administradorgeneral", "publicistaflashttoo"].includes(admin?.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const service = createServiceClient();
  const { error } = await service.storage.from("ads").upload(path, buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { publicUrl } } = service.storage.from("ads").getPublicUrl(path);

  // Also insert the ad record (bypasses ads table RLS)
  const body = formData.get("meta");
  if (body) {
    const meta = JSON.parse(body as string);
    const expires_at = meta.duration_days
      ? new Date(Date.now() + meta.duration_days * 24 * 60 * 60 * 1000).toISOString()
      : null;
    const { data: newAd, error: insErr } = await service.from("ads").insert({
      brand_name: meta.brand_name,
      image_url: publicUrl,
      contact_url: meta.contact_url || null,
      city: meta.city || null,
      is_active: true,
      expires_at,
    }).select().single();
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    return NextResponse.json({ url: publicUrl, ad: newAd });
  }

  return NextResponse.json({ url: publicUrl });
}
