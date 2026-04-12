import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { adId, type } = await req.json();
  if (!adId || (type !== "click" && type !== "view")) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const service = createServiceClient();
  const col = type === "click" ? "clicks_count" : "views_count";

  // Fetch current value, increment, update
  const { data: ad } = await service.from("ads").select(col).eq("id", adId).single();
  if (!ad) return NextResponse.json({ ok: true }); // silent — ad may not exist

  const current = (ad as Record<string, number>)[col] ?? 0;
  await service.from("ads").update({ [col]: current + 1 }).eq("id", adId);

  return NextResponse.json({ ok: true });
}
