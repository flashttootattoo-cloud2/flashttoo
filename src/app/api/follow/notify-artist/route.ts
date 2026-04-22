import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import webpush from "web-push";

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { artistId } = await req.json();
  if (!artistId) return NextResponse.json({ error: "Missing artistId" }, { status: 400 });

  const service = createServiceClient();
  const [{ data: followerProfile }, { data: artistProfile }] = await Promise.all([
    service.from("profiles").select("full_name, username").eq("id", user.id).single(),
    service.from("profiles").select("username").eq("id", artistId).single(),
  ]);
  const followerName = followerProfile?.full_name ?? followerProfile?.username ?? "Alguien";
  const artistUsername = artistProfile?.username ?? "";
  const { data: subs } = await service
    .from("push_subscriptions")
    .select("id, subscription")
    .eq("user_id", artistId);

  if (!subs || subs.length === 0) {
    return NextResponse.json({ ok: false, reason: "no_subscription" });
  }

  const payload = JSON.stringify({
    title: "Nuevo seguidor",
    body: `${followerName} empezó a seguirte`,
    url: `/artist/${artistUsername}`,
    tag: `follow-${user.id}`,
  });

  const results = await Promise.allSettled(
    subs.map((row) =>
      webpush.sendNotification(row.subscription, payload, { urgency: "normal", TTL: 86400 })
    )
  );

  const staleIds: string[] = [];
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      const err = result.reason as { statusCode?: number };
      if (err.statusCode === 410 || err.statusCode === 404) staleIds.push(subs[i].id);
    }
  });
  if (staleIds.length > 0) await service.from("push_subscriptions").delete().in("id", staleIds);

  return NextResponse.json({ ok: true });
}
