import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId } = await req.json();
  if (!conversationId) return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });

  const { data: conv } = await supabase
    .from("conversations")
    .select("id, participant_1, participant_2, deleted_by_1, deleted_by_2")
    .eq("id", conversationId)
    .single();

  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isP1 = conv.participant_1 === user.id;
  const isP2 = conv.participant_2 === user.id;
  if (!isP1 && !isP2) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const service = createServiceClient();

  const newDeleted1 = isP1 ? true : conv.deleted_by_1;
  const newDeleted2 = isP2 ? true : conv.deleted_by_2;

  // Both sides deleted — purge for real
  if (newDeleted1 && newDeleted2) {
    await service.from("messages").delete().eq("conversation_id", conversationId);
    await service.from("conversations").delete().eq("id", conversationId);
    return NextResponse.json({ ok: true, purged: true });
  }

  // Only this user deleted — soft delete
  await service
    .from("conversations")
    .update({ deleted_by_1: newDeleted1, deleted_by_2: newDeleted2 })
    .eq("id", conversationId);

  return NextResponse.json({ ok: true, purged: false });
}
