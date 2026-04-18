import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { PLAN_LIMITS } from "@/lib/plan-config";
import { NextResponse } from "next/server";

// Vercel cron llama a este endpoint diariamente.
// Protegido con CRON_SECRET para que nadie lo llame desde afuera.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error, count } = await supabase
    .from("view_events")
    .delete({ count: "exact" })
    .lt("viewed_at", thirtyDaysAgo);

  if (error) {
    console.error("[cron/cleanup] error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[cron/cleanup] eliminados ${count} view_events de más de 30 días`);

  // Auto-downgrade: planes vencidos → free
  const service = createServiceClient();
  const now = new Date().toISOString();
  const { data: expired } = await service
    .from("profiles")
    .select("id, plan")
    .neq("plan", "free")
    .not("plan_expires_at", "is", null)
    .lt("plan_expires_at", now);

  let downgraded = 0;
  for (const profile of expired ?? []) {
    const { data: activeDesigns } = await service
      .from("designs")
      .select("id")
      .eq("artist_id", profile.id)
      .eq("is_archived", false)
      .order("created_at", { ascending: false });

    const toArchive = (activeDesigns ?? []).slice(PLAN_LIMITS["free"]);
    if (toArchive.length > 0) {
      await service.from("designs").update({ is_archived: true })
        .in("id", toArchive.map((d: { id: string }) => d.id));
    }
    await service
      .from("profiles")
      .update({ plan: "free", plan_expires_at: null, paypal_subscription_id: null })
      .eq("id", profile.id);
    downgraded++;
  }

  if (downgraded > 0) console.log(`[cron/cleanup] ${downgraded} planes vencidos bajados a free`);
  return NextResponse.json({ deleted: count, downgraded });
}
