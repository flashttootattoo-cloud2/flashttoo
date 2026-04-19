export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MasonryGrid } from "@/components/masonry-grid";
import Link from "next/link";
import {
  MapPin,
  Globe,
  Phone,
  MessageSquare,
  CheckCircle,
  ImageIcon,
  Zap,
  LayoutDashboard,
} from "lucide-react";
import { FollowButton } from "@/components/follow-button";
import { ShareButton } from "@/components/share-button";
import { ArtistReportButton } from "@/components/artist-report-button";
import { computeTrustScore, trustRingClass, trustLabel, trustColor } from "@/lib/trust-score";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();
  const { data: artist } = await supabase
    .from("profiles")
    .select("full_name, bio, avatar_url, city, country")
    .eq("username", username)
    .eq("role", "tattoo_artist")
    .single();

  if (!artist) return {};

  const title = `${artist.full_name} (@${username}) – Flashttoo`;
  const location = [artist.city, artist.country].filter(Boolean).join(", ");
  const description = artist.bio
    ? artist.bio
    : `Mirá los diseños flash de ${artist.full_name}${location ? ` en ${location}` : ""}. Reservá tu turno en Flashttoo.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: artist.avatar_url ? [{ url: artist.avatar_url, width: 400, height: 400 }] : [],
      type: "profile",
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: artist.avatar_url ? [artist.avatar_url] : [],
    },
  };
}

export default async function ArtistProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  // artist profile + session in parallel
  const [{ data: artist }, { data: { session } }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("username", username)
      .eq("role", "tattoo_artist")
      .single(),
    supabase.auth.getSession(),
  ]);

  if (!artist) notFound();

  const user = session?.user ?? null;
  const isOwnProfile = user?.id === artist.id;

  // designs + follow + trust data in parallel
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: rawDesigns }, , followResult, { count: recentReports }, { count: reservationCount }, { data: designStats }, { data: myReport }] = await Promise.all([
    supabase
      .from("designs")
      .select("*, artist:profiles!designs_artist_id_fkey(*)")
      .eq("artist_id", artist.id)
      .eq("is_archived", false)
      .eq("is_admin_hidden", false)
      .order("created_at", { ascending: false }),
    user
      ? supabase.from("design_likes").select("design_id").eq("user_id", user.id)
      : Promise.resolve({ data: [] }),
    user && !isOwnProfile
      ? supabase.from("follows").select("follower_id").eq("follower_id", user.id).eq("following_id", artist.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("profile_reports").select("*", { count: "exact", head: true })
      .eq("reported_id", artist.id).gte("created_at", thirtyDaysAgo),
    supabase.from("reservations").select("*", { count: "exact", head: true })
      .eq("artist_id", artist.id).eq("status", "confirmed"),
    supabase.from("designs").select("likes_count").eq("artist_id", artist.id).eq("is_archived", false),
    user && !isOwnProfile
      ? supabase.from("profile_reports").select("created_at")
          .eq("reporter_id", user.id).eq("reported_id", artist.id)
          .gte("created_at", sevenDaysAgo).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const totalLikes = (designStats ?? []).reduce((acc, d) => acc + (d.likes_count ?? 0), 0);
  const { score: trustScore } = computeTrustScore({
    created_at: artist.created_at,
    avatar_url: artist.avatar_url,
    bio: artist.bio,
    city: artist.city,
    instagram: artist.instagram,
    followers_count: artist.followers_count,
    total_likes: totalLikes,
    active_designs: rawDesigns?.length ?? 0,
    recent_reports: recentReports ?? 0,
    has_reservations: (reservationCount ?? 0) > 0,
    trust_score_manual: artist.trust_score_manual ?? 0,
    is_blocked: artist.is_blocked,
    is_verified: artist.is_verified ?? false,
  });
  const isVerified = artist.is_verified ?? false;

  const daysUntilCanReport = myReport?.created_at
    ? Math.ceil((new Date(myReport.created_at).getTime() + 7 * 24 * 60 * 60 * 1000 - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  // If blocked, hide all designs from the public (owner still sees their dash)
  const designs = artist.is_blocked ? [] : (rawDesigns ?? []).sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return 0;
  });

  const isFollowing = !!(followResult as any).data;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {artist.is_blocked && (
        <div className="mb-8 flex items-start gap-4 bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-4">
          <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-red-400 text-lg font-bold">!</span>
          </div>
          <div>
            <p className="font-semibold text-red-400 mb-1">Cuenta pausada</p>
            <p className="text-sm text-zinc-400">
              Esta cuenta fue pausada por posible incumplimiento de nuestras condiciones de uso. Estamos analizando el contenido. Si creés que es un error, contactanos.
            </p>
          </div>
        </div>
      )}

      {/* Profile header */}
      <div className="flex flex-row gap-4 mb-4 items-start">
        <div className="flex-shrink-0 flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar className={`w-20 h-20 md:w-28 md:h-28 border-4 border-zinc-700 ${trustRingClass(trustScore, isVerified)}`}>
              <AvatarImage src={artist.avatar_url ?? ""} />
              <AvatarFallback className="bg-amber-400 text-zinc-900 text-2xl md:text-3xl font-bold">
                {artist.full_name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {isVerified && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center shadow-lg" title="Tatuador verificado">
                <CheckCircle className="w-4 h-4 text-zinc-900" />
              </div>
            )}
          </div>
          {!isOwnProfile && (
            <FollowButton
              artistId={artist.id}
              artistName={artist.full_name ?? artist.username}
              userId={user?.id ?? null}
              initialFollowing={isFollowing}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <h1 className="text-xl font-bold">{artist.full_name}</h1>
            {artist.plan === "studio" && <CheckCircle className="w-4 h-4 text-blue-400" />}
            {(artist.plan === "pro" || artist.plan === "premium") && <CheckCircle className="w-4 h-4 text-amber-400" />}
            {artist.plan === "basic" && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
            {artist.plan === "studio" ? (
              <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-xs">Estudio</Badge>
            ) : (artist.plan === "pro" || artist.plan === "premium") ? (
              <Badge className="bg-amber-400/10 text-amber-400 border-amber-400/30 text-xs">Pro</Badge>
            ) : null}
            {(trustScore >= 40 || isVerified) && (
              <span className={`text-xs font-medium ${trustColor(trustScore, isVerified)}`} title={`Score de confianza: ${trustScore}/100`}>
                ✦ {trustLabel(trustScore, isVerified)}
              </span>
            )}
          </div>

          <p className="text-zinc-400 text-xs mb-1">@{artist.username}</p>

          {artist.bio && (
            <p className="text-zinc-300 text-sm mb-2 max-w-xl">{artist.bio}</p>
          )}

          <div className="flex flex-wrap gap-3 text-xs text-zinc-400 mb-2">
            {artist.city && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {artist.city}{artist.country ? `, ${artist.country}` : ""}
              </div>
            )}
            {artist.instagram && (
              <a
                href={`https://instagram.com/${artist.instagram.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-white transition-colors"
              >
                <Globe className="w-3 h-3" />
                {artist.instagram}
              </a>
            )}
            {artist.phone && (
              <div className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {artist.phone}
              </div>
            )}
          </div>

          <div className="flex gap-4 text-xs">
            <div>
              <span className="font-bold text-white text-sm">{designs?.length ?? 0}</span>
              <span className="text-zinc-400 ml-1">diseños</span>
            </div>
            <div>
              <span className="font-bold text-white text-sm">{artist.followers_count ?? 0}</span>
              <span className="text-zinc-400 ml-1">seguidores</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons — full width below the header row */}
      {isOwnProfile ? (
        <div className="flex gap-2 mb-6">
          <ShareButton username={artist.username} className="flex-1 min-w-0" />
          <Button asChild size="sm" variant="outline" className="flex-1 min-w-0 border-zinc-700 hover:bg-zinc-800">
            <Link href="/dashboard">
              <LayoutDashboard className="w-4 h-4 mr-1.5 shrink-0" />
              <span className="truncate">Dashboard</span>
            </Link>
          </Button>
        </div>
      ) : (
        <div className="flex gap-2 mb-6 items-center">
          <ShareButton username={artist.username} className="flex-1 min-w-0" />
          {user && (
            <Button asChild size="sm" className="flex-1 min-w-0 bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold">
              <Link href={`/messages?user=${artist.id}`}>
                <MessageSquare className="w-4 h-4 mr-1.5 shrink-0" />
                <span className="truncate">Mensaje</span>
              </Link>
            </Button>
          )}
          <ArtistReportButton
            artistId={artist.id}
            artistName={artist.full_name ?? artist.username}
            userId={user?.id ?? null}
            daysUntilCanReport={daysUntilCanReport}
          />
        </div>
      )}

      {/* Designs */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-amber-400" />
            Galería Flash
          </h2>
          {isOwnProfile && (
            <Button
              asChild
              size="sm"
              className="bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold"
            >
              <Link href="/dashboard/upload">
                <Zap className="w-4 h-4 mr-1.5" />
                Subir diseño
              </Link>
            </Button>
          )}
        </div>

        {designs && designs.length > 0 ? (
          <MasonryGrid designs={designs as never} />
        ) : (
          <div className="text-center py-20 text-zinc-500">
            <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">
              {artist.is_blocked
                ? "Los diseños no están disponibles mientras la cuenta está pausada"
                : isOwnProfile
                  ? "Todavía no subiste ningún diseño"
                  : "Este artista no tiene diseños todavía"}
            </p>
            {isOwnProfile && !artist.is_blocked && (
              <Button asChild className="mt-4 bg-amber-400 hover:bg-amber-300 text-zinc-900">
                <Link href="/dashboard/upload">Subir mi primer diseño</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
