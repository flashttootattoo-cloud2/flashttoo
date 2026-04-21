import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { MapPin, CheckCircle, Brush, ImageIcon, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExploreSearch } from "@/components/explore-search";

export const revalidate = 30;

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; q?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase
    .from("profiles")
    .select("*")
    .or("role.eq.tattoo_artist,keep_in_explore.eq.true")
    .eq("is_blocked", false);

  // city y q se pueden combinar
  if (params.city) query = query.ilike("city", `%${params.city}%`);
  if (params.q) {
    query = query.or(
      `full_name.ilike.%${params.q}%,username.ilike.%${params.q}%,bio.ilike.%${params.q}%`
    );
  }

  const { data: artists } = await query.limit(80);

  const artistIds = (artists ?? []).map((a) => a.id);

  // Fetch preview images + engagement stats (likes/views) in one query
  const { data: allDesigns } = artistIds.length
    ? await supabase
        .from("designs")
        .select("artist_id, image_url, likes_count, views_count")
        .in("artist_id", artistIds)
        .eq("is_available", true)
        .eq("is_archived", false)
    : { data: [] };

  // Group by artist_id
  const designsByArtist: Record<string, { image_url: string; likes_count: number; views_count: number }[]> = {};
  for (const d of allDesigns ?? []) {
    if (!designsByArtist[d.artist_id]) designsByArtist[d.artist_id] = [];
    designsByArtist[d.artist_id].push({
      image_url: d.image_url,
      likes_count: d.likes_count ?? 0,
      views_count: d.views_count ?? 0,
    });
  }

  // Plan weight: studio = 4, pro/premium = 3, basic = 2, free = 1
  const planWeight = (plan: string) =>
    plan === "studio" ? 4 : plan === "pro" || plan === "premium" ? 3 : plan === "basic" ? 2 : 1;

  // Score per artist:
  //   plan tier (heavily weighted) +
  //   active design count +
  //   total engagement (likes × 5 + views × 0.1) +
  //   profile completeness bonus
  type DesignRow = { image_url: string; likes_count: number; views_count: number };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function artistScore(artist: Record<string, any>, designs: DesignRow[] = []) {
    const count   = Math.min(designs.length, 30) * 10;        // hasta 30 diseños, 10pts c/u
    const likes   = designs.reduce((s, d) => s + d.likes_count, 0) * 5;
    const views   = designs.reduce((s, d) => s + d.views_count, 0) * 0.1;
    const profile = (artist.avatar_url ? 20 : 0) + (artist.bio ? 15 : 0) + (artist.city ? 10 : 0);
    const base    = count + likes + views + profile;

    // El plan amplifica el contenido — sin diseños, no hay ventaja de plan.
    // Con 5+ diseños el multiplicador es completo.
    const contentFactor = Math.min(1, designs.length / 5);
    const planBoost = planWeight(artist.plan ?? "free") * 200 * contentFactor;

    return base + planBoost;
  }

  const artistsWithPreviews = (artists ?? [])
    .map((artist) => {
      const all = designsByArtist[artist.id] ?? [];
      return {
        ...artist,
        preview_designs: all.slice(0, 3),
        real_designs_count: all.length,
        _score: artistScore(artist, all),
      };
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, 40);

  const popularCities = [
    "Buenos Aires", "Ciudad de México", "Madrid", "Barcelona",
    "Bogotá", "São Paulo", "Lima", "Miami",
    "Nueva York", "Londres", "Berlin", "Tokyo",
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">
          Explorá tatuadores <span className="text-amber-400">por ciudad</span>
        </h1>
        <p className="text-zinc-400">Buscá tatuadores en tu ciudad o cerca tuyo para tatuarte</p>
      </div>

      {/* Buscador unificado con autocompletado */}
      <ExploreSearch defaultCity={params.city ?? ""} defaultQ={params.q ?? ""} />

      {/* City chips — scrolleable, mismo estilo que style-filter */}
      <div className="relative -mx-4 mb-8 border-b border-zinc-900">
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-zinc-950 to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-zinc-950 to-transparent z-10" />
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-2.5">
          <Link
            href="/explore"
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              !params.city && !params.q
                ? "bg-amber-400 text-zinc-900"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
            }`}
          >
            Todas
          </Link>
          {popularCities.map((city) => (
            <Link
              key={city}
              href={`/explore?city=${encodeURIComponent(city)}`}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                params.city === city
                  ? "bg-amber-400 text-zinc-900"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
              }`}
            >
              {city}
            </Link>
          ))}
        </div>
      </div>

      {/* Resultados */}
      {!user ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
          <div className="w-16 h-16 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
            <Users className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Unite a Flashttoo</h2>
            <p className="text-zinc-400 max-w-sm">
              La comunidad que conecta amantes de los tatuajes originales con artistas de todo el mundo. Registrate gratis para descubrir tatuadores cerca tuyo.
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild className="bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold px-6">
              <Link href="/auth/register">Crear cuenta gratis</Link>
            </Button>
            <Button asChild variant="outline" className="border-zinc-700 text-white hover:bg-zinc-800 px-6">
              <Link href="/auth/login">Iniciar sesión</Link>
            </Button>
          </div>
        </div>
      ) : artistsWithPreviews.length > 0 ? (
        <>
          <p className="text-zinc-500 text-sm mb-4">
            {artistsWithPreviews.length} tatuador{artistsWithPreviews.length !== 1 ? "es" : ""} encontrado{artistsWithPreviews.length !== 1 ? "s" : ""}
            {params.city ? ` en ${params.city}` : ""}
            {params.q ? ` · "${params.q}"` : ""}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {artistsWithPreviews.map((artist) => (
              <Link
                key={artist.id}
                href={`/artist/${artist.username}`}
                className="group bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-amber-400/40 transition-all hover:shadow-lg hover:shadow-amber-400/5"
              >
                {/* Preview de diseños */}
                <div className="grid grid-cols-3 h-32">
                  {artist.preview_designs.length > 0 ? (
                    artist.preview_designs.map((d: { image_url: string }, i: number) => (
                      <div key={i} className="relative overflow-hidden">
                        <img
                          src={d.image_url}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ))
                  ) : (
                    <div className="col-span-3 flex items-center justify-center bg-zinc-800 text-zinc-600">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}
                  {Array(3 - artist.preview_designs.length)
                    .fill(0)
                    .map((_, i) => (
                      <div key={`empty-${i}`} className="bg-zinc-800" />
                    ))}
                </div>

                {/* Info del artista */}
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="w-10 h-10 border-2 border-zinc-700">
                      <AvatarImage src={artist.avatar_url ?? ""} />
                      <AvatarFallback className="bg-amber-400 text-zinc-900 font-bold">
                        {artist.full_name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-white text-sm truncate">
                          {artist.full_name}
                        </p>
                        {artist.plan === "studio" && <CheckCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                        {(artist.plan === "pro" || artist.plan === "premium") && <CheckCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        {artist.plan === "basic" && <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />}
                      </div>
                      <p className="text-zinc-500 text-xs truncate">@{artist.username}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    {artist.city && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {artist.city}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      {artist.real_designs_count} diseños
                    </div>
                  </div>

                  {artist.plan === "studio" ? (
                    <Badge className="mt-2 bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">Estudio</Badge>
                  ) : (artist.plan === "pro" || artist.plan === "premium") ? (
                    <Badge className="mt-2 bg-amber-400/10 text-amber-400 border-amber-400/20 text-xs">Pro</Badge>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-20 text-zinc-500">
          <Brush className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No se encontraron tatuadores</p>
          {(params.city || params.q) && (
            <p className="text-sm mt-1">
              Intentá con otro término o{" "}
              <Link href="/explore" className="text-amber-400 hover:underline">
                ver todos
              </Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

