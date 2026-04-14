import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { notifyFollowers } from "@/lib/notify-followers";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { artistId, artistName, designId, designTitle, designImage } = await req.json();

  if (!artistId || !designId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (user.id !== artistId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await notifyFollowers({ artistId, artistName, designId, designTitle, designImage });

  return NextResponse.json({ ok: true });
}
