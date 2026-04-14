import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { notifyFollowers, type FollowerNotifyType } from "@/lib/notify-followers";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { artistId, artistName, type, designId, designTitle, designImage, artistUsername } = await req.json();

  if (!artistId || !designId || !type) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Only the artist themselves can trigger this
  if (user.id !== artistId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await notifyFollowers({
    artistId,
    artistName,
    type: type as FollowerNotifyType,
    designId,
    designTitle,
    designImage,
    artistUsername,
  });

  return NextResponse.json({ ok: true });
}
