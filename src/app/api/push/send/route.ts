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

  const { data: sub } = await supabase
    .from("push_subscriptions")
    .select("subscription")
    .eq("user_id", recipientId)
    .single();

  if (!sub) return NextResponse.json({ ok: false, reason: "no_subscription" });

  try {
    await webpush.sendNotification(
      sub.subscription,
      JSON.stringify({
        title: `Mensaje de ${senderName}`,
        body: messagePreview,
        url: "/messages",
      })
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, reason: "send_failed" });
  }
}
