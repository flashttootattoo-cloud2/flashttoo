import { createClient } from "@/lib/supabase/server";
import { MasonryGrid } from "@/components/masonry-grid";
import { StyleFilter } from "@/components/style-filter";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Flame, Search } from "lucide-react";

export const dynamic = "force-dynamic";

// Seed hourly so the feed reshuffles every hour but stays stable within it
function hourlySeed(): number {
  const now = new Date();
  return now.getFullYear() * 1000000 + (now.getMonth() + 1) * 10000 + now.getDate() * 100 + now.getHours();
}
function seededRandom(seed: number, id: string): number {
  let h = seed;
  for (let i = 0; i < id.length; i++) { h = Math.imul(h ^ id.charCodeAt(i), 0x9e3779b9); h ^= h >>> 16; }
  return (h >>> 0) / 0xffffffff;
}

const planWeight = (p: string) => p === "studio" ? 4 : p === "pro" || p === "premium" ? 3 : p === "basic" ? 2 : 1;

function blendedScore(design: any, seed: number): number {
  const likes      = (design.likes_count ?? 0);
  const views      = (design.views_count ?? 0);
  const ageMs      = Date.now() - new Date(design.created_at ?? 0).getTime();
  const ageDays    = ageMs / (1000 * 60 * 60 * 24);

  // Engagement: likes pesa más que vistas, decae suavemente (^1.2 en vez de ^1.8)
  const engagement = (likes * 10 + views * 0.5) / Math.pow(ageDays + 1, 1.2);

  // Frescura: bonus para diseños de los últimos 14 días, se evapora después
  const freshness  = Math.max(0, 14 - ageDays) * 3;

  // Aleatoriedad: 0–40 pts, diferente por diseño pero estable dentro de la hora
  const randomness = seededRandom(seed, design.id) * 40;

  // Plan boost: amplifica contenido de planes pagos, requiere algo de engagement
  const contentFactor = Math.min(1, (likes + views * 0.1) / 10);
  const planBoost  = planWeight(design.artist?.plan ?? "free") * 60 * contentFactor;

  return engagement + freshness + randomness + planBoost;
}

const FREE_INTERVAL = 3;

function buildFeed(raw: any[]): any[] {
  const seed = hourlySeed();

  const scored = raw.map((d) => ({ ...d, _score: blendedScore(d, seed) }));

  const paid = scored
    .filter((d) => d.artist?.plan !== "free")
    .sort((a, b) => b._score - a._score);

  const free = scored
    .filter((d) => d.artist?.plan === "free")
    .sort((a, b) => b._score - a._score);

  const feed: any[] = [];
  let freeIdx = 0;
  for (let i = 0; i < paid.length; i++) {
    feed.push(paid[i]);
    if ((i + 1) % FREE_INTERVAL === 0 && freeIdx < free.length) {
      feed.push(free[freeIdx++]);
    }
  }
  while (freeIdx < free.length) feed.push(free[freeIdx++]);
  return feed;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ style?: string; q?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // User city for ad targeting
  const { data: { user } } = await supabase.auth.getUser();
  let userCity: string | null = null;
  if (user) {
    const { data: prof } = await supabase.from("profiles").select("city").eq("id", user.id).single();
    userCity = prof?.city ?? null;
  }

  let designQuery = supabase
    .from("designs")
    .select("*, artist:profiles!designs_artist_id_fkey(id, full_name, username, avatar_url, city, plan, is_blocked)")
    .eq("is_available", true)
    .eq("is_archived", false)
    .eq("is_admin_hidden", false)
    .limit(80);

  if (params.style) designQuery = designQuery.eq("style", params.style);
  if (params.q)     designQuery = designQuery.ilike("title", `%${params.q}%`);

  const [{ data: rawDesigns }, { data: rawAds }] = await Promise.all([
    designQuery,
    supabase.from("ads").select("*").eq("is_active", true),
  ]);

  // Filter out blocked artists
  const filtered = (rawDesigns ?? []).filter((d) => !d.artist?.is_blocked);
  const designs = buildFeed(filtered);

  // Ads: global (no city) always show; city ads only if user city matches
  const ads = (rawAds ?? []).filter((a) =>
    !a.city || (userCity && a.city.toLowerCase() === userCity.toLowerCase())
  );

  // Inject 1 ad every 4 designs. If there are fewer than 4 designs, inject at the end.
  const AD_INTERVAL = 4;
  const feed: any[] = [];
  let adIdx = 0;
  for (let i = 0; i < designs.length; i++) {
    feed.push(designs[i]);
    if ((i + 1) % AD_INTERVAL === 0 && adIdx < ads.length) {
      feed.push({ ...ads[adIdx++], _isAd: true });
    }
  }
  // If no ad was injected yet (fewer than AD_INTERVAL designs), add one at the end
  if (adIdx === 0 && ads.length > 0) {
    feed.push({ ...ads[0], _isAd: true });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {!designs.length && (
        <section className="text-center py-20">
          <div className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/20 rounded-full px-4 py-1.5 text-amber-400 text-sm font-medium mb-6">
            <Flame className="w-4 h-4" />
            La plataforma global de tatuajes flash
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4 leading-tight">
            Descubrí diseños únicos.<br />
            <span className="text-amber-400">Reservá tu lugar.</span>
          </h1>
          <p className="text-zinc-400 text-xl mb-8 max-w-lg mx-auto">
            Conectamos tatuadores con clientes. Explorá galerías flash, buscá
            por ciudad y agendá tu próximo tatuaje.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button asChild size="lg" className="bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold px-8">
              <Link href="/explore"><Search className="w-4 h-4 mr-2" /> Explorar por ciudad</Link>
            </Button>
          </div>
        </section>
      )}

      <StyleFilter />

      {feed.length > 0 ? (
        <MasonryGrid designs={feed as any} />
      ) : (
        <div className="text-center py-24 text-zinc-500">
          <p className="text-lg">Aún no hay diseños publicados.</p>
        </div>
      )}
    </div>
  );
}
