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

  const { recipientId, senderName, messagePreview, conversationId } = await req.json();

  // Use service client to bypass RLS — sender querying recipient's subscriptions
  const service = createServiceClient();
  const { data: subs } = await service
    .from("push_subscriptions")
    .select("id, subscription")
    .eq("user_id", recipientId);

  if (!subs || subs.length === 0) {
    return NextResponse.json({ ok: false, reason: "no_subscription" });
  }

  const payload = JSON.stringify({
    title: `Mensaje de ${senderName}`,
    body: messagePreview,
    url: "/messages",
    tag: conversationId ?? "message",
  });

  const results = await Promise.allSettled(
    subs.map((row) => webpush.sendNotification(row.subscription, payload))
  );

  const staleIds: string[] = [];
  const errors: string[] = [];

  results.forEach((result, i) => {
    if (result.status === "rejected") {
      const err = result.reason as { statusCode?: number; message?: string };
      errors.push(`sub[${i}] status=${err.statusCode} ${err.message ?? ""}`);
      if (err.statusCode === 410 || err.statusCode === 404) staleIds.push(subs[i].id);
    }
  });

  if (errors.length > 0) console.error("[push/send] errors:", errors);
  if (staleIds.length > 0) await service.from("push_subscriptions").delete().in("id", staleIds);

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ ok: sent > 0, sent, errors });
}
