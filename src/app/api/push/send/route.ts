import { createClient } from "@/lib/supabase/server";
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

  const { recipientId, senderName, messagePreview } = await req.json();

  // Fetch ALL subscriptions for the recipient (one per device)
  const { data: subs } = await supabase
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
  });

  // Send to all devices, remove expired subscriptions
  const results = await Promise.allSettled(
    subs.map((row) => webpush.sendNotification(row.subscription, payload))
  );

  // Clean up subscriptions that are no longer valid (410 Gone)
  const staleIds: string[] = [];
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      const status = (result.reason as { statusCode?: number })?.statusCode;
      if (status === 410 || status === 404) staleIds.push(subs[i].id);
    }
  });
  if (staleIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", staleIds);
  }

  return NextResponse.json({ ok: true });
}
