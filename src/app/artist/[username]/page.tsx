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
} from "lucide-react";
import { FollowButton } from "@/components/follow-button";
import { ShareButton } from "@/components/share-button";
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

  // designs + personalisation queries in parallel
  const [{ data: rawDesigns }, , followResult] = await Promise.all([
    supabase
      .from("designs")
      .select("*, artist:profiles!designs_artist_id_fkey(*)")
      .eq("artist_id", artist.id)
      .eq("is_archived", false)
      .order("created_at", { ascending: false }),
    user
      ? supabase.from("design_likes").select("design_id").eq("user_id", user.id)
      : Promise.resolve({ data: [] }),
    user && !isOwnProfile
      ? supabase.from("follows").select("follower_id").eq("follower_id", user.id).eq("following_id", artist.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // Pinned designs first, then by created_at (already ordered from DB)
  const designs = (rawDesigns ?? []).sort((a, b) => {
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
      <div className="flex flex-col md:flex-row gap-6 mb-10">
        <div className="flex-shrink-0">
          <Avatar className="w-28 h-28 border-4 border-zinc-700">
            <AvatarImage src={artist.avatar_url ?? ""} />
            <AvatarFallback className="bg-amber-400 text-zinc-900 text-3xl font-bold">
              {artist.full_name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{artist.full_name}</h1>
            {artist.plan === "studio" && <CheckCircle className="w-5 h-5 text-blue-400" />}
            {(artist.plan === "pro" || artist.plan === "premium") && <CheckCircle className="w-5 h-5 text-amber-400" />}
            {artist.plan === "basic" && <CheckCircle className="w-4 h-4 text-emerald-400" />}
            {artist.plan === "studio" ? (
              <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30">Estudio</Badge>
            ) : (artist.plan === "pro" || artist.plan === "premium") ? (
              <Badge className="bg-amber-400/10 text-amber-400 border-amber-400/30">Pro</Badge>
            ) : null}
          </div>

          <p className="text-zinc-400 text-sm mb-3">@{artist.username}</p>

          {artist.bio && (
            <p className="text-zinc-300 mb-4 max-w-xl">{artist.bio}</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-zinc-400 mb-4">
            {artist.city && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {artist.city}
                {artist.country ? `, ${artist.country}` : ""}
              </div>
            )}
            {artist.instagram && (
              <a
                href={`https://instagram.com/${artist.instagram.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-white transition-colors"
              >
                <Globe className="w-4 h-4" />
                {artist.instagram}
              </a>
            )}
            {artist.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="w-4 h-4" />
                {artist.phone}
              </div>
            )}
          </div>

          <div className="flex gap-5 text-sm mb-5">
            <div>
              <span className="font-bold text-white text-lg">
                {designs?.length ?? 0}
              </span>
              <span className="text-zinc-400 ml-1.5">diseños</span>
            </div>
            <div>
              <span className="font-bold text-white text-lg">
                {artist.followers_count ?? 0}
              </span>
              <span className="text-zinc-400 ml-1.5">seguidores</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <ShareButton username={artist.username} />
            {isOwnProfile ? (
              <Button asChild variant="outline" className="border-zinc-700 hover:bg-zinc-800">
                <Link href="/dashboard">Editar perfil</Link>
              </Button>
            ) : (
              <>
                {user && (
                  <Button
                    asChild
                    className="bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold"
                  >
                    <Link href={`/messages?user=${artist.id}`}>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Enviar mensaje
                    </Link>
                  </Button>
                )}
                <FollowButton
                  artistId={artist.id}
                  userId={user?.id ?? null}
                  initialFollowing={isFollowing}
                  initialCount={artist.followers_count ?? 0}
                />
              </>
            )}
          </div>
        </div>
      </div>

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
              {isOwnProfile ? "Todavía no subiste ningún diseño" : "Este artista no tiene diseños todavía"}
            </p>
            {isOwnProfile && (
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
