import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import webpush from "web-push";

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: Request) {
  const { designId, designTitle, designImage, saverId } = await req.json();
  if (!designId || !saverId) return NextResponse.json({ ok: false });

  const supabase = createServiceClient();

  // 1. Buscar todos los usuarios que guardaron este diseño (menos quien acaba de guardar)
  const { data: otherSavers } = await supabase
    .from("design_likes")
    .select("user_id")
    .eq("design_id", designId)
    .neq("user_id", saverId);

  if (!otherSavers || otherSavers.length === 0) return NextResponse.json({ ok: true, notified: 0 });

  const userIds = otherSavers.map((r) => r.user_id);
  const savesCount = otherSavers.length + 1; // incluye al nuevo saver

  // 2. Insertar notificaciones en DB (upsert: una por design por usuario, actualiza count)
  await supabase.from("notifications").upsert(
    userIds.map((uid) => ({
      user_id: uid,
      design_id: designId,
      design_title: designTitle,
      design_image: designImage ?? null,
      saves_count: savesCount,
      read: false,
    })),
    { onConflict: "user_id,design_id", ignoreDuplicates: false }
  );

  // 3. Enviar push notification a cada usuario
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("user_id, subscription")
    .in("user_id", userIds);

  if (subs && subs.length > 0) {
    await Promise.allSettled(
      subs.map((s) =>
        webpush.sendNotification(
          s.subscription,
          JSON.stringify({
            title: "Reservá primero",
            body: `${savesCount} personas tienen guardado "${designTitle}"`,
            url: `/design/${designId}`,
            icon: designImage ?? "/logo.png",
          })
        )
      )
    );
  }

  // 4. Broadcast realtime a cada usuario conectado
  for (const uid of userIds) {
    const ch = supabase.channel(`user-notify:${uid}`);
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        ch.send({
          type: "broadcast",
          event: "new_notification",
          payload: { designId, designTitle, designImage, savesCount },
        }).then(() => supabase.removeChannel(ch));
      }
    });
  }

  return NextResponse.json({ ok: true, notified: userIds.length });
}
