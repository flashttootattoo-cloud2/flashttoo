import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReserveButton } from "@/components/reserve-button";
import Link from "next/link";
import {
  MapPin,
  Ruler,
  Bookmark,
  Eye,
  CheckCircle,
  ArrowLeft,
  MessageSquare,
  Tag,
  UserCircle,
} from "lucide-react";
import { fmt } from "@/lib/utils";
import { DesignGallery } from "@/components/design-gallery";
import { SaveButton } from "@/components/save-button";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: design } = await supabase
    .from("designs")
    .select("title, description, image_url, artist:profiles!designs_artist_id_fkey(full_name, username)")
    .eq("id", id)
    .single();

  if (!design) return {};

  const artist = design.artist as unknown as { full_name: string; username: string } | null;
  const title = `${design.title} – Flash por @${artist?.username ?? ""}`;
  const description = design.description ?? `Diseño flash disponible para tatuar. Reservá en Flashttoo.`;
  const image = design.image_url;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: image, width: 1200, height: 630 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function DesignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: design }, { data: extraImages }, { data: savedRow }] = await Promise.all([
    supabase
      .from("designs")
      .select("*, artist:profiles!designs_artist_id_fkey(*)")
      .eq("id", id)
      .single(),
    supabase
      .from("design_images")
      .select("id, image_url, sort_order")
      .eq("design_id", id)
      .order("sort_order"),
    user
      ? supabase.from("design_likes").select("id").eq("design_id", id).eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!design) notFound();

  // Incrementar contador + registrar evento histórico (para gráfico premium)
  supabase.rpc("increment_design_views", { design_id: id }).then(() => {});
  supabase.from("view_events")
    .insert({ design_id: id, artist_id: design.artist_id })
    .then(({ error }) => { if (error) console.error("[view_events insert]", error.message); });

  const artist = design.artist as NonNullable<typeof design.artist>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al feed
      </Link>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Image / Gallery */}
        <div>
          <div className="relative">
            <DesignGallery
              coverUrl={design.image_url}
              title={design.title}
              extraImages={extraImages ?? []}
              isAvailable={design.is_available}
            />
            {user && (
              <div className="absolute top-3 right-3 z-10">
                <SaveButton
                  designId={design.id}
                  designTitle={design.title}
                  artistId={design.artist_id}
                  userId={user.id}
                  initialSaved={!!savedRow}
                  initialCount={design.likes_count ?? 0}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 mt-4 text-zinc-400 text-sm px-1">
            <div className="flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              {fmt(design.views_count ?? 0)} vistas
            </div>
            <div className="flex items-center gap-1.5">
              <Bookmark className="w-4 h-4" />
              {fmt(design.likes_count ?? 0)} guardados
            </div>
          </div>

          {(design.likes_count ?? 0) >= 2 && design.is_available && (
            <div className="mt-3 flex items-center gap-2 bg-amber-400/10 border border-amber-400/30 rounded-xl px-4 py-2.5 text-sm">
              <Bookmark className="w-4 h-4 text-amber-400 fill-current shrink-0" />
              <span className="text-amber-300 font-medium">
                {fmt(design.likes_count!)} {design.likes_count === 1 ? "persona tiene" : "personas tienen"} este diseño guardado — reservá primero.
              </span>
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            {design.style && (
              <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                {design.style}
              </Badge>
            )}
            {design.body_part && (
              <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                {design.body_part}
              </Badge>
            )}
          </div>

          <h1 className="text-2xl font-bold mb-3">{design.title}</h1>

          {design.description && (
            <p className="text-zinc-400 mb-5 leading-relaxed">{design.description}</p>
          )}

          <div className="space-y-3 mb-6">
            {(design.width_cm || design.height_cm) && (
              <div className="flex items-center gap-2 text-sm">
                <Ruler className="w-4 h-4 text-amber-400" />
                <span className="text-zinc-300">
                  Medidas:{" "}
                  <span className="text-white font-medium">
                    {design.width_cm && design.height_cm
                      ? `${design.width_cm} × ${design.height_cm} cm`
                      : `${design.width_cm ?? design.height_cm} cm`}
                  </span>
                </span>
              </div>
            )}
            {design.price && (
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-400" />
                <span className="text-2xl font-bold text-amber-400">
                  ${design.price}{" "}
                  <span className="text-sm text-zinc-400">{design.currency}</span>
                </span>
              </div>
            )}
            {(design as any).artist_tag && (
              <div className="flex items-center gap-2 text-sm">
                <UserCircle className="w-4 h-4 text-blue-400" />
                <span className="text-zinc-300">
                  Tatuador:{" "}
                  <span className="text-white font-medium">{(design as any).artist_tag}</span>
                </span>
              </div>
            )}
          </div>

          {/* Reserve */}
          {design.is_available && (
            <div className="mb-6">
              {user ? (
                <ReserveButton design={design as never} userId={user.id} />
              ) : (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                  <p className="text-zinc-400 text-sm mb-3">
                    Iniciá sesión para reservar este diseño
                  </p>
                  <Button asChild className="bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold w-full">
                    <Link href="/auth/login">Iniciar sesión</Link>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Artist card */}
          {artist && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">
                Tatuador/a
              </p>
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={artist.avatar_url ?? ""} />
                  <AvatarFallback className="bg-amber-400 text-zinc-900 font-bold">
                    {artist.full_name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-white truncate">{artist.full_name}</p>
                    {artist.plan === "studio" && <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />}
                    {(artist.plan === "pro" || artist.plan === "premium") && <CheckCircle className="w-4 h-4 text-amber-400 shrink-0" />}
                    {artist.plan === "basic" && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </div>
                  <p className="text-zinc-500 text-sm">@{artist.username}</p>
                  {artist.city && (
                    <div className="flex items-center gap-1 text-zinc-400 text-xs mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {artist.city}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <Button asChild variant="outline" className="border-zinc-700 hover:bg-zinc-800 text-sm" size="sm">
                  <Link href={`/artist/${artist.username}`}>Ver perfil</Link>
                </Button>
                {user && user.id !== artist.id && (
                  <Button
                    asChild
                    size="sm"
                    className="bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold text-sm"
                  >
                    <Link href={`/messages?user=${artist.id}`}>
                      <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                      Mensaje
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
