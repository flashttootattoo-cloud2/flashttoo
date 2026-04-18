import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import type { PlanType } from "@/types/database";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { subscriptionId, planType } = await req.json();
  if (!subscriptionId || !planType) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const validPlans: PlanType[] = ["basic", "pro", "studio"];
  if (!validPlans.includes(planType)) {
    return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
  }

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  const service = createServiceClient();
  const { error } = await service
    .from("profiles")
    .update({
      plan: planType,
      plan_expires_at: expiresAt.toISOString(),
      paypal_subscription_id: subscriptionId,
    })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
