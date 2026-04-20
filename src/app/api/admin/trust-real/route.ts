import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { computeTrustScore } from "@/lib/trust-score";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "administradorgeneral") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const service = createServiceClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: profile },
    { data: designs },
    { count: recentReports },
    { count: reservationCount },
  ] = await Promise.all([
    service.from("profiles").select("created_at, avatar_url, bio, city, instagram, followers_count, trust_score_manual, is_blocked, is_verified").eq("id", userId).single(),
    service.from("designs").select("likes_count").eq("artist_id", userId).eq("is_archived", false),
    service.from("profile_reports").select("*", { count: "exact", head: true }).eq("reported_id", userId).gte("created_at", thirtyDaysAgo),
    service.from("reservations").select("*", { count: "exact", head: true }).eq("artist_id", userId).eq("status", "confirmed"),
  ]);

  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const totalLikes = (designs ?? []).reduce((acc, d) => acc + (d.likes_count ?? 0), 0);
  const activeDesigns = designs?.length ?? 0;

  const { score } = computeTrustScore({
    created_at: profile.created_at,
    avatar_url: profile.avatar_url,
    bio: profile.bio,
    city: profile.city,
    instagram: profile.instagram,
    followers_count: profile.followers_count,
    total_likes: totalLikes,
    active_designs: activeDesigns,
    recent_reports: recentReports ?? 0,
    has_reservations: (reservationCount ?? 0) > 0,
    trust_score_manual: profile.trust_score_manual ?? 0,
    is_blocked: profile.is_blocked,
    is_verified: profile.is_verified ?? false,
  });

  const natural = score - (profile.trust_score_manual ?? 0);

  return NextResponse.json({ natural, total: score, totalLikes, activeDesigns });
}
