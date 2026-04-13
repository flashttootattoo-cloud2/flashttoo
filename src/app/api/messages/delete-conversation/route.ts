import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId } = await req.json();
  if (!conversationId) return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });

  // Verify the user is a participant
  const { data: conv } = await supabase
    .from("conversations")
    .select("id, participant_1, participant_2")
    .eq("id", conversationId)
    .single();

  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (conv.participant_1 !== user.id && conv.participant_2 !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = createServiceClient();
  await service.from("messages").delete().eq("conversation_id", conversationId);
  await service.from("conversations").delete().eq("id", conversationId);

  return NextResponse.json({ ok: true });
}
