import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { PLAN_LIMITS } from "@/lib/plan-config";

async function verifyWebhook(req: NextRequest, rawBody: string): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return true; // skip verification if not configured yet

  const transmissionId  = req.headers.get("paypal-transmission-id") ?? "";
  const transmissionTime = req.headers.get("paypal-transmission-time") ?? "";
  const certUrl         = req.headers.get("paypal-cert-url") ?? "";
  const authAlgo        = req.headers.get("paypal-auth-algo") ?? "";
  const transmissionSig = req.headers.get("paypal-transmission-sig") ?? "";

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!;
  const secret   = process.env.PAYPAL_SECRET!;
  const base     = "https://api-m.paypal.com";

  const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": "Basic " + Buffer.from(`${clientId}:${secret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const { access_token } = await tokenRes.json();
  if (!access_token) return false;

  const verifyRes = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transmission_id: transmissionId,
      transmission_time: transmissionTime,
      cert_url: certUrl,
      auth_algo: authAlgo,
      transmission_sig: transmissionSig,
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody),
    }),
  });
  const { verification_status } = await verifyRes.json();
  return verification_status === "SUCCESS";
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const valid = await verifyWebhook(req, rawBody);
  if (!valid) {
    console.error("[paypal/webhook] invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { event_type: string; resource: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const service = createServiceClient();
  const { event_type, resource } = event;
  const subId = resource?.id as string | undefined;

  console.log(`[paypal/webhook] ${event_type} subId=${subId}`);

  if (!subId) return NextResponse.json({ ok: true });

  switch (event_type) {

    // Pago mensual exitoso — renovar plan_expires_at por 1 mes más
    case "PAYMENT.SALE.COMPLETED": {
      const billingSubId = (resource?.billing_agreement_id ?? subId) as string;
      const newExpiry = new Date();
      newExpiry.setMonth(newExpiry.getMonth() + 1);
      await service
        .from("profiles")
        .update({ plan_expires_at: newExpiry.toISOString() })
        .eq("paypal_subscription_id", billingSubId);
      break;
    }

    // Usuario canceló — dejar correr hasta fin del período (plan_expires_at ya está seteado)
    case "BILLING.SUBSCRIPTION.CANCELLED":
    case "BILLING.SUBSCRIPTION.EXPIRED": {
      // Bajar a free solo si ya venció (el cron se encarga normalmente)
      // Pero si PayPal dice EXPIRED, bajamos de inmediato
      if (event_type === "BILLING.SUBSCRIPTION.EXPIRED") {
        const { data: profile } = await service
          .from("profiles")
          .select("id, plan")
          .eq("paypal_subscription_id", subId)
          .single();

        if (profile && profile.plan !== "free") {
          const activeDesigns = await service
            .from("designs")
            .select("id")
            .eq("artist_id", profile.id)
            .eq("is_archived", false)
            .order("created_at", { ascending: false });

          const toArchive = (activeDesigns.data ?? []).slice(PLAN_LIMITS["free"]);
          if (toArchive.length > 0) {
            await service.from("designs").update({ is_archived: true })
              .in("id", toArchive.map((d: { id: string }) => d.id));
          }

          await service
            .from("profiles")
            .update({ plan: "free", plan_expires_at: null, paypal_subscription_id: null })
            .eq("id", profile.id);
        }
      }
      break;
    }

    // Pago fallido 2 veces — suspender
    case "BILLING.SUBSCRIPTION.PAYMENT.FAILED":
    case "BILLING.SUBSCRIPTION.SUSPENDED": {
      await service
        .from("profiles")
        .update({ plan_expires_at: new Date().toISOString() })
        .eq("paypal_subscription_id", subId);
      break;
    }
  }

  return NextResponse.json({ ok: true });
}
