import { createServiceClient } from "@/lib/supabase/service";
import webpush from "web-push";

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export type FollowerNotifyType = "new_design" | "design_reserved";

export async function notifyFollowers({
  artistId,
  artistName,
  type,
  designId,
  designTitle,
  designImage,
  artistUsername,
}: {
  artistId: string;
  artistName: string;
  type: FollowerNotifyType;
  designId: string;
  designTitle: string;
  designImage?: string;
  artistUsername?: string;
}) {
  const service = createServiceClient();

  // Get all followers of this artist
  const { data: followers } = await service
    .from("follows")
    .select("follower_id")
    .eq("following_id", artistId);

  if (!followers || followers.length === 0) return;

  const followerIds = followers.map((f: { follower_id: string }) => f.follower_id);

  const isNewDesign = type === "new_design";
  const pushTitle = isNewDesign
    ? `Nuevo diseño de ${artistName}`
    : `${artistName} confirmó una reserva`;
  const pushBody = isNewDesign
    ? `"${designTitle}" — disponible ahora`
    : `"${designTitle}" fue reservado`;
  const url = isNewDesign
    ? `/design/${designId}`
    : `/artist/${artistUsername ?? artistId}`;

  // Insert DB notifications — try with type column first, fall back without it
  const rows = followerIds.map((uid: string) => ({
    user_id: uid,
    design_id: designId,
    design_title: designTitle,
    design_image: designImage ?? null,
    saves_count: 0,
    type,
    read: false,
  }));
  const { error: upsertErr } = await service
    .from("notifications")
    .upsert(rows, { onConflict: "user_id,design_id", ignoreDuplicates: false });
  if (upsertErr) {
    // Likely the `type` column doesn't exist yet — retry without it
    const rowsNoType = rows.map(({ type: _t, ...r }) => r);
    const { error: retryErr } = await service
      .from("notifications")
      .upsert(rowsNoType, { onConflict: "user_id,design_id", ignoreDuplicates: false });
    if (retryErr) console.error("[notifyFollowers] notification upsert failed:", retryErr.message);
  }

  // Realtime broadcast so open tabs get the red dot immediately
  for (const uid of followerIds) {
    const ch = service.channel(`user-notify:${uid}`);
    ch.subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        ch.send({
          type: "broadcast",
          event: "new_notification",
          payload: { designId, designTitle, designImage, savesCount: 0, notifType: type },
        }).then(() => service.removeChannel(ch));
      }
    });
  }

  // Push notifications to subscribed devices
  const { data: subs } = await service
    .from("push_subscriptions")
    .select("id, user_id, subscription")
    .in("user_id", followerIds);

  if (!subs || subs.length === 0) return;

  const payload = JSON.stringify({
    title: pushTitle,
    body: pushBody,
    url,
    icon: designImage ?? "/icon-notification.png",
    badge: "/notification-badge.png",
  });

  const results = await Promise.allSettled(
    subs.map((s: { id: string; subscription: webpush.PushSubscription }) =>
      webpush.sendNotification(s.subscription, payload)
    )
  );

  // Clean up expired subscriptions
  const staleIds: string[] = [];
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      const status = (result.reason as { statusCode?: number })?.statusCode;
      if (status === 410 || status === 404) staleIds.push(subs[i].id);
    }
  });
  if (staleIds.length > 0) {
    await service.from("push_subscriptions").delete().in("id", staleIds);
  }
}
