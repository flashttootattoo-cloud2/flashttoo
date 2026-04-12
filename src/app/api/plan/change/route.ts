import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const PLAN_LIMITS: Record<string, number> = {
  free: 5, basic: 15, pro: 30, premium: 30, studio: 80,
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { newPlan } = await req.json();
  if (!PLAN_LIMITS[newPlan]) return NextResponse.json({ error: "Plan inválido" }, { status: 400 });

  // Get current active designs ordered by created_at desc (newest first = keep)
  const { data: activeDesigns } = await supabase
    .from("designs")
    .select("id")
    .eq("artist_id", user.id)
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  const newLimit = PLAN_LIMITS[newPlan];
  const toArchive = (activeDesigns ?? []).slice(newLimit); // everything beyond the new limit

  // Archive excess designs (never delete)
  if (toArchive.length > 0) {
    await supabase
      .from("designs")
      .update({ is_archived: true })
      .in("id", toArchive.map((d) => d.id));
  }

  // Update plan (cancel = free, otherwise set new plan)
  const { error } = await supabase
    .from("profiles")
    .update({
      plan: newPlan,
      plan_expires_at: newPlan === "free" ? null : undefined,
    })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ archived: toArchive.length });
}
