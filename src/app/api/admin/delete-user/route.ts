import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "administradorgeneral") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  if (userId === user.id) return NextResponse.json({ error: "No podés eliminarte a vos mismo" }, { status: 400 });

  const s = createServiceClient();

  // 1. Push subscriptions
  await s.from("push_subscriptions").delete().eq("user_id", userId);

  // 2. Notifications
  await s.from("notifications").delete().eq("user_id", userId);

  // 3. Follows (as follower or followed)
  await s.from("follows").delete().or(`follower_id.eq.${userId},following_id.eq.${userId}`);

  // 4. Profile reports (as reporter or reported)
  await s.from("profile_reports").delete().or(`reporter_id.eq.${userId},reported_id.eq.${userId}`);

  // 5. Design likes by this user
  await s.from("design_likes").delete().eq("user_id", userId);

  // 6. Reservations by this user as client or artist
  await s.from("reservations").delete().eq("client_id", userId);
  await s.from("reservations").delete().eq("artist_id", userId);

  // 7. View events
  await s.from("view_events").delete().eq("user_id", userId);

  // 8. Get the user's designs to clean up their child records
  const { data: designs } = await s.from("designs").select("id").eq("artist_id", userId);
  if (designs && designs.length > 0) {
    const designIds = designs.map((d) => d.id);
    await s.from("reports").delete().in("design_id", designIds);
    await s.from("design_likes").delete().in("design_id", designIds);
    await s.from("reservations").delete().in("design_id", designIds);
    await s.from("design_images").delete().in("design_id", designIds);
    await s.from("designs").delete().in("id", designIds);
  }

  // 9. Reports made by this user (on other designs)
  await s.from("reports").delete().eq("reporter_id", userId);

  // 10. Messages sent by this user
  await s.from("messages").delete().eq("sender_id", userId);

  // 11. Conversations where this user is a participant
  await s.from("conversations").delete().or(`participant_1.eq.${userId},participant_2.eq.${userId}`);

  // 12. Profile
  await s.from("profiles").delete().eq("id", userId);

  // 13. Finally delete the auth user
  const { error } = await s.auth.admin.deleteUser(userId);
  if (error) {
    console.error("[delete-user] auth error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
