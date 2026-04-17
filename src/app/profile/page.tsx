export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SavedDesignsGrid } from "@/components/saved-design-card";
import Link from "next/link";
import { MapPin, Heart, Settings } from "lucide-react";

import { FollowingList } from "@/components/following-list";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/auth/login");

  // Diseños que likeó
  const { data: likedDesigns } = await supabase
    .from("design_likes")
    .select("design_id, designs:designs(*, artist:profiles!designs_artist_id_fkey(*))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(40);

  const designs = (likedDesigns ?? [])
    .map((l: any) => l.designs)
    .filter(Boolean);

  // Tatuadores que sigue
  const { data: followingData } = await supabase
    .from("follows")
    .select("following_id, artist:profiles!follows_following_id_fkey(*)")
    .eq("follower_id", user.id)
    .limit(20);

  const following = (followingData ?? []).map((f: any) => f.artist).filter(Boolean);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {profile.is_blocked && (
        <div className="mb-8 flex items-start gap-4 bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-4">
          <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-red-400 text-lg font-bold">!</span>
          </div>
          <div>
            <p className="font-semibold text-red-400 mb-1">Cuenta pausada</p>
            <p className="text-sm text-zinc-400">
              Tu cuenta fue pausada por posible incumplimiento de nuestras condiciones de uso. Estamos analizando tu contenido. Si creés que es un error, contactanos.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-row gap-4 mb-6 items-start">
        <Avatar className="w-20 h-20 border-4 border-zinc-700 shrink-0">
          <AvatarImage src={profile.avatar_url ?? ""} />
          <AvatarFallback className="bg-amber-400 text-zinc-900 text-2xl font-bold">
            {profile.full_name?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <h1 className="text-xl font-bold leading-tight">{profile.full_name}</h1>
            {profile.role === "tattoo_artist" ? (
              <Badge className="bg-amber-400/10 text-amber-400 border-amber-400/20 text-xs">Tatuador/a</Badge>
            ) : (
              <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-xs">Cliente</Badge>
            )}
          </div>
          <p className="text-zinc-400 text-xs mb-1">@{profile.username}</p>

          {profile.city && (
            <div className="flex items-center gap-1 text-zinc-400 text-xs mb-1">
              <MapPin className="w-3 h-3" />
              {profile.city}{profile.country ? `, ${profile.country}` : ""}
            </div>
          )}

          <div className="flex gap-4 text-xs mb-2">
            <div>
              <span className="font-bold text-white text-sm">{designs.length}</span>
              <span className="text-zinc-400 ml-1">guardados</span>
            </div>
            <div>
              <span className="font-bold text-white text-sm">{following.length}</span>
              <span className="text-zinc-400 ml-1">siguiendo</span>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {profile.role === "tattoo_artist" && (
              <Button asChild size="sm" className="bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold">
                <Link href={`/artist/${profile.username}`}>Ver perfil público</Link>
              </Button>
            )}
            <Button asChild variant="outline" size="sm" className="border-zinc-700 hover:bg-zinc-800">
              <Link href="/dashboard/settings">
                <Settings className="w-4 h-4 mr-1.5" /> Editar perfil
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <FollowingList artists={following} />

      {/* Diseños guardados */}
      <div>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Heart className="w-4 h-4 text-amber-400" />
          Diseños guardados
        </h2>

        {designs.length > 0 ? (
          <SavedDesignsGrid designs={designs as any} userId={user.id} />
        ) : (
          <div className="text-center py-16 text-zinc-500">
            <Heart className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Todavía no guardaste ningún diseño</p>
            <Button asChild className="mt-4 bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold" size="sm">
              <Link href="/">Explorar diseños</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
