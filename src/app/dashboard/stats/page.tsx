import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ArrowLeft, Eye, Bookmark, CalendarDays, TrendingUp, Zap, CreditCard } from "lucide-react";
import { fmt } from "@/lib/utils";
import Link from "next/link";
import { ViewsChart } from "@/components/views-chart";
import { PlanChangeButton } from "@/components/plan-change-button";
import { PLAN_LIMITS } from "@/lib/plan-config";

export const dynamic = "force-dynamic"; // siempre datos frescos, sin cache

export default async function StatsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "tattoo_artist") redirect("/");
  if (profile.plan === "free") redirect("/plans");

  // isPremium = acceso a charts avanzados (reservas, vistas por día)
  const isPremium = profile.plan === "pro" || profile.plan === "premium" || profile.plan === "studio";

  // All paid plans: designs sorted by views
  // Pro/Studio only: reservations for conversion/chart
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: designs }, { data: reservations }, { data: viewEvents }, { data: profileViewEvents }] = await Promise.all([
    supabase
      .from("designs")
      .select("id, title, image_url, views_count, likes_count, created_at")
      .eq("artist_id", user.id)
      .eq("is_archived", false)
      .order("views_count", { ascending: false }),
    isPremium
      ? supabase.from("reservations").select("id, status, created_at").eq("artist_id", user.id)
      : Promise.resolve({ data: [] }),
    isPremium
      ? supabase
          .from("view_events")
          .select("viewed_at")
          .eq("artist_id", user.id)
          .eq("type", "design")
          .gte("viewed_at", thirtyDaysAgo)
      : Promise.resolve({ data: [], error: null }),
    isPremium
      ? supabase
          .from("view_events")
          .select("viewed_at")
          .eq("artist_id", user.id)
          .eq("type", "profile")
          .gte("viewed_at", thirtyDaysAgo)
      : Promise.resolve({ data: [], error: null }),
  ]);

  // Build last-30-days series
  // viewEvents is null when the table doesn't exist yet (migration not run)
  const viewEventsReady = isPremium && Array.isArray(viewEvents);
  const dailyViews: { date: string; views: number }[] = [];

  if (viewEventsReady) {
    const countByDay: Record<string, number> = {};
    for (const ev of viewEvents!) {
      const day = (ev as any).viewed_at.slice(0, 10);
      countByDay[day] = (countByDay[day] ?? 0) + 1;
    }
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      dailyViews.push({ date: key, views: countByDay[key] ?? 0 });
    }
  }

  // Profile views daily series
  const profileViewsReady = isPremium && Array.isArray(profileViewEvents);
  const dailyProfileViews: { date: string; views: number }[] = [];
  if (profileViewsReady) {
    const countByDay: Record<string, number> = {};
    for (const ev of profileViewEvents!) {
      const day = (ev as any).viewed_at.slice(0, 10);
      countByDay[day] = (countByDay[day] ?? 0) + 1;
    }
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      dailyProfileViews.push({ date: key, views: countByDay[key] ?? 0 });
    }
  }
  const totalProfileViews = profileViewEvents?.length ?? 0;

  const totalViews = designs?.reduce((a, d) => a + (d.views_count ?? 0), 0) ?? 0;
  const totalLikes = designs?.reduce((a, d) => a + (d.likes_count ?? 0), 0) ?? 0;
  const totalReservations = reservations?.length ?? 0;
  const conversionRate = totalViews > 0
    ? ((totalReservations / totalViews) * 100).toFixed(1)
    : "0";

  // Monthly chart — premium only
  const byMonth: Record<string, number> = {};
  reservations?.forEach((r) => {
    const month = (r as any).created_at.slice(0, 7);
    byMonth[month] = (byMonth[month] ?? 0) + 1;
  });
  const monthlyData = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6);
  const maxMonthly = Math.max(...monthlyData.map(([, v]) => v), 1);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al dashboard
      </Link>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Estadísticas</h1>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
          profile.plan === "studio"
            ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
            : profile.plan === "basic"
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            : "bg-amber-400/10 text-amber-400 border-amber-400/20"
        }`}>
          {profile.plan === "studio" ? "Estudio" : profile.plan === "pro" || profile.plan === "premium" ? "Pro" : "✓"}
        </span>
      </div>

      {/* Overview — basic: vistas + guardados | premium: + reservas + conversión + visitas perfil */}
      <div className={`grid grid-cols-2 ${isPremium ? "lg:grid-cols-5" : "lg:grid-cols-2"} gap-4 mb-8`}>
        {[
          { label: "Vistas diseños", value: totalViews, icon: Eye, color: "text-emerald-400", show: true },
          { label: "Guardados totales", value: totalLikes, icon: Bookmark, color: "text-amber-400", show: true },
          { label: "Visitas al perfil", value: totalProfileViews, icon: TrendingUp, color: "text-blue-400", show: isPremium, sub: "últimos 30 días" },
          { label: "Reservas recibidas", value: totalReservations, icon: CalendarDays, color: "text-amber-400", show: isPremium },
          { label: "Vistas → reserva", value: `${conversionRate}%`, icon: TrendingUp, color: "text-blue-400", show: isPremium },
        ].filter((s) => s.show).map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className={`${color} mb-2`}><Icon className="w-5 h-5" /></div>
            <p className="text-2xl font-bold">{typeof value === "number" ? fmt(value) : value}</p>
            <p className="text-zinc-400 text-sm">{label}</p>
            {sub && <p className="text-zinc-600 text-xs mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Daily views line chart — premium only */}
      {isPremium && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-400" />
              Visitas por día — últimos 30 días
            </h2>
            {viewEventsReady && (
              <span className="text-xs text-zinc-500">
                {dailyViews.reduce((s, d) => s + d.views, 0)} visitas totales
              </span>
            )}
          </div>

          {viewEventsReady ? (
            <ViewsChart data={dailyViews} />
          ) : (
            <div className="flex flex-col items-center justify-center h-32 gap-3 text-center">
              <p className="text-zinc-400 text-sm font-medium">Tabla de eventos no configurada</p>
              <p className="text-zinc-600 text-xs max-w-sm">
                Ejecutá este SQL en Supabase para activar el gráfico:
              </p>
              <code className="text-xs bg-zinc-800 text-amber-400 px-3 py-1.5 rounded-lg">
                create table public.view_events (...)
              </code>
              <p className="text-zinc-600 text-xs">Ver instrucciones en el chat con el desarrollador</p>
            </div>
          )}
        </div>
      )}

      {/* Profile visits chart — premium only */}
      {isPremium && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              Visitas al perfil — últimos 30 días
            </h2>
            {profileViewsReady && (
              <span className="text-xs text-zinc-500">
                {totalProfileViews} visitas totales
              </span>
            )}
          </div>
          {profileViewsReady ? (
            <ViewsChart data={dailyProfileViews} />
          ) : (
            <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
              Sin datos aún
            </div>
          )}
        </div>
      )}

      {/* Reservations chart — premium only */}
      {isPremium && monthlyData.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
          <h2 className="font-semibold mb-5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            Reservas por mes
          </h2>
          <div className="flex items-end gap-3 h-32">
            {monthlyData.map(([month, count]) => (
              <div key={month} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-xs text-zinc-500 font-medium">{count}</span>
                <div
                  className="w-full bg-amber-400/80 rounded-t transition-all"
                  style={{ height: `${(count / maxMonthly) * 100}%`, minHeight: "4px" }}
                />
                <span className="text-xs text-zinc-500">{month.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upgrade prompt for basic users */}
      {!isPremium && (
        <div className="bg-zinc-900 border border-amber-400/20 rounded-xl p-5 mb-6 flex items-center gap-4">
          <TrendingUp className="w-8 h-8 text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-white">Reservas y conversión</p>
            <p className="text-zinc-400 text-sm">Disponible en Premium — ve cuántas reservas recibís por mes y tu tasa de cierre.</p>
          </div>
          <Link
            href="/plans"
            className="shrink-0 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold text-sm rounded-lg transition-colors"
          >
            Ver Premium
          </Link>
        </div>
      )}

      {/* Top designs — both plans */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          Diseños más vistos
        </h2>
        {designs && designs.length > 0 ? (
          <div className="space-y-3">
            {designs.slice(0, isPremium ? 10 : 5).map((design, i) => (
              <Link
                key={design.id}
                href={`/design/${design.id}`}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-zinc-800 transition-colors"
              >
                <span className="text-zinc-500 text-sm font-mono w-5 text-center">{i + 1}</span>
                <img src={design.image_url} alt={design.title} className="w-10 h-10 rounded-lg object-cover" />
                <p className="flex-1 text-sm font-medium truncate">{design.title}</p>
                <div className="flex items-center gap-4 text-xs text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />{fmt(design.views_count ?? 0)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Bookmark className="w-3.5 h-3.5" />{fmt(design.likes_count ?? 0)}
                  </span>
                </div>
              </Link>
            ))}
            {!isPremium && designs.length > 5 && (
              <p className="text-center text-zinc-600 text-xs pt-2">
                +{designs.length - 5} más · <Link href="/plans" className="text-amber-400 hover:underline">Premium</Link> muestra todos
              </p>
            )}
          </div>
        ) : (
          <p className="text-zinc-500 text-sm">No hay diseños aún.</p>
        )}
      </div>

      {/* Gestión de plan */}
      <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2 flex-1">
            <CreditCard className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-white">Cambiar de plan</p>
              <p className="text-xs text-zinc-400">
                Cancelá tu suscripción y luego elegí el nuevo plan desde{" "}
                <Link href="/plans" className="text-amber-400 hover:underline">la página de planes</Link>.
              </p>
            </div>
          </div>
          <div className="w-full sm:w-48 shrink-0">
            <PlanChangeButton
              targetPlan="free"
              targetName="Gratis"
              targetSlots={5}
              currentSlots={PLAN_LIMITS[profile.plan] ?? 5}
              activeDesigns={designs?.length ?? 0}
              direction="cancel"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
