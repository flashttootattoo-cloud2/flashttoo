import { createServiceClient } from "@/lib/supabase/service";
import { Users, Brush, CalendarDays, TrendingUp, UserCheck, CreditCard, Clock } from "lucide-react";
import { GrowthChart } from "@/components/growth-chart";

export const dynamic = "force-dynamic";

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <div className={`${color} mb-3`}><Icon className="w-5 h-5" /></div>
      <p className="text-3xl font-bold text-white mb-0.5">{value}</p>
      <p className="text-sm text-zinc-400">{label}</p>
      {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  );
}

export default async function AdminMetricasPage() {
  const service = createServiceClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalUsers },
    { count: totalArtists },
    { count: activeDesigns },
    { count: reservationsMonth },
    { count: newUsersWeek },
    { count: totalReservations },
    { data: planBreakdown },
    { count: activeAds },
    { data: growthRaw },
  ] = await Promise.all([
    service.from("profiles").select("*", { count: "exact", head: true }),
    service.from("profiles").select("*", { count: "exact", head: true }).eq("role", "tattoo_artist").eq("is_blocked", false),
    service.from("designs").select("*", { count: "exact", head: true }).eq("is_archived", false).eq("is_admin_hidden", false),
    service.from("reservations").select("*", { count: "exact", head: true }).gte("created_at", startOfMonth),
    service.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    service.from("reservations").select("*", { count: "exact", head: true }),
    service.from("profiles").select("plan").eq("role", "tattoo_artist").eq("is_blocked", false),
    service.from("ads").select("*", { count: "exact", head: true }).eq("is_active", true),
    service.from("profiles").select("created_at, role").gte("created_at", ninetyDaysAgo),
  ]);
  // Build 90-day cumulative growth series
  const countByDay: Record<string, { artists: number; clients: number }> = {};
  for (const p of growthRaw ?? []) {
    const day = (p.created_at as string).slice(0, 10);
    if (!countByDay[day]) countByDay[day] = { artists: 0, clients: 0 };
    if (p.role === "tattoo_artist") countByDay[day].artists++;
    else countByDay[day].clients++;
  }
  // Cumulative over 90 days
  let cumArtists = 0;
  let cumClients = 0;
  const growthData = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    cumArtists += countByDay[key]?.artists ?? 0;
    cumClients += countByDay[key]?.clients ?? 0;
    growthData.push({ date: key, artists: cumArtists, clients: cumClients });
  }

  const plans = (planBreakdown ?? []).reduce((acc: Record<string, number>, p) => {
    acc[p.plan] = (acc[p.plan] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-xl font-bold mb-1">Métricas</h1>
      <p className="text-zinc-500 text-sm mb-8">Estado general de la plataforma</p>

      {/* Main stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Usuarios totales" value={totalUsers ?? 0} icon={Users} color="text-blue-400" />
        <StatCard label="Tatuadores activos" value={totalArtists ?? 0} icon={UserCheck} color="text-amber-400" />
        <StatCard label="Diseños publicados" value={activeDesigns ?? 0} icon={Brush} color="text-emerald-400" />
        <StatCard label="Reservas totales" value={totalReservations ?? 0} icon={CalendarDays} color="text-purple-400" />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Reservas este mes" value={reservationsMonth ?? 0} sub={now.toLocaleString("es-AR", { month: "long", year: "numeric" })} icon={TrendingUp} color="text-emerald-400" />
        <StatCard label="Nuevos usuarios" value={newUsersWeek ?? 0} sub="últimos 7 días" icon={Clock} color="text-blue-400" />
        <StatCard label="Publicidades activas" value={activeAds ?? 0} icon={CreditCard} color="text-amber-400" />
      </div>

      {/* Growth chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6">
        <h2 className="font-semibold mb-1 text-sm">Crecimiento — últimos 90 días</h2>
        <p className="text-xs text-zinc-500 mb-4">Usuarios acumulados desde hace 90 días</p>
        <GrowthChart data={growthData} />
      </div>

      {/* Plan breakdown */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h2 className="font-semibold mb-4 text-sm">Tatuadores por plan</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { key: "studio", label: "Estudio", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
            { key: "pro",    label: "Pro",     color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
            { key: "basic",  label: "Basic",   color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
            { key: "free",   label: "Free",    color: "text-zinc-400 bg-zinc-800 border-zinc-700" },
          ].map(({ key, label, color }) => (
            <div key={key} className={`rounded-xl border px-4 py-3 ${color}`}>
              <p className="text-2xl font-bold">{plans[key] ?? 0}</p>
              <p className="text-xs mt-0.5 opacity-80">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
