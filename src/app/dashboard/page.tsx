import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { EarlyBirdWelcome } from "@/components/early-bird-welcome";

export const dynamic = "force-dynamic";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  ImageIcon,
  CalendarDays,
  Settings,
  Eye,
  Bookmark,
  TrendingUp,
  Zap,
  CheckCircle,
  Clock,
  XCircle,
  MessageSquare,
  Scissors,
} from "lucide-react";
import { fmt } from "@/lib/utils";
import { DesignActions } from "@/components/design-actions";
import type { PlanType } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // profile, designs and reservations in parallel
  const [{ data: profile }, { data: allDesigns }, { data: reservations }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("designs")
      .select("id, title, image_url, is_available, is_archived, is_pinned, is_admin_hidden, views_count, likes_count, created_at")
      .eq("artist_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("reservations")
      .select("*, client:profiles!reservations_client_id_fkey(*), design:designs!reservations_design_id_fkey(title, image_url)")
      .eq("artist_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (!profile || profile.role !== "tattoo_artist") {
    redirect("/");
  }

  // Auto-clean: delete rejected/completed reservations older than 24h
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  supabase
    .from("reservations")
    .delete()
    .eq("artist_id", user.id)
    .in("status", ["rejected", "completed"])
    .lt("updated_at", cutoff)
    .then(() => {});

  if (profile.is_blocked) {
    redirect(`/artist/${profile.username}`);
  }

  const designs         = (allDesigns ?? []).filter((d) => !d.is_archived);
  const archivedDesigns = (allDesigns ?? []).filter((d) => d.is_archived);
  const pinnedCount     = designs.filter((d) => d.is_pinned).length;
  const reservedCount   = designs.filter((d) => !d.is_available).length;
  const userPlan       = (profile.plan ?? "free") as PlanType;

  const totalViews = designs?.reduce((acc, d) => acc + (d.views_count ?? 0), 0) ?? 0;
  const totalSaved = designs?.reduce((acc, d) => acc + (d.likes_count ?? 0), 0) ?? 0;
  const pendingReservations = reservations?.filter((r) => r.status === "pending").length ?? 0;
  const isPremium = profile.plan !== "free";

  const stats = [
    { label: "Diseños publicados", value: designs?.length ?? 0, icon: ImageIcon, color: "text-blue-400" },
    { label: "Vistas totales", value: totalViews, icon: Eye, color: "text-emerald-400" },
    { label: "Guardados totales", value: totalSaved, icon: Bookmark, color: "text-amber-400" },
    { label: "Reservas pendientes", value: pendingReservations, icon: CalendarDays, color: "text-amber-400" },
  ];

  const statusConfig = {
    pending: { label: "Pendiente", icon: Clock, className: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20" },
    confirmed: { label: "Confirmada", icon: CheckCircle, className: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20" },
    rejected: { label: "Rechazada", icon: XCircle, className: "bg-red-400/10 text-red-400 border-red-400/20" },
    completed: { label: "Completada", icon: CheckCircle, className: "bg-blue-400/10 text-blue-400 border-blue-400/20" },
  };

  return (
    <>
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Mi Dashboard</h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            Bienvenido, {profile.full_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none border-zinc-700 hover:bg-zinc-800"
          >
            <Link href="/dashboard/settings">
              <Settings className="w-4 h-4 mr-1.5" />
              Perfil
            </Link>
          </Button>
          {!isPremium && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none border-amber-400/30 text-amber-400 hover:bg-amber-400/10"
            >
              <Link href="/plans">
                <Zap className="w-4 h-4 mr-1.5" />
                Mejorar plan
              </Link>
            </Button>
          )}
          <Button
            asChild
            size="sm"
            className="flex-1 sm:flex-none bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold"
          >
            <Link href="/dashboard/upload">
              <Upload className="w-4 h-4 mr-2" />
              Subir diseño
            </Link>
          </Button>
        </div>
      </div>

      {/* Aviso slots bloqueados por reservas */}
      {reservedCount > 0 && (
        <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-4 mb-6 flex items-center gap-3">
          <Scissors className="w-5 h-5 text-amber-400 shrink-0" />
          <p className="text-sm text-zinc-300 flex-1">
            Tenés <span className="font-semibold text-amber-400">{reservedCount} diseño{reservedCount > 1 ? "s" : ""} reservado{reservedCount > 1 ? "s" : ""}</span> ocupando slot{reservedCount > 1 ? "s" : ""}.
            Cuando lo tatúes, tocá <span className="font-medium text-white">Tatuado · liberar slot</span> para subir uno nuevo.
          </p>
        </div>
      )}

      {/* Plan badge */}
      {!isPremium && (
        <div className="bg-gradient-to-r from-amber-400/10 to-amber-600/5 border border-amber-400/20 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="font-semibold text-amber-400">Plan Gratuito</p>
            <p className="text-zinc-400 text-sm">
              Mejorá a Premium para desbloquear estadísticas, listado prioritario y más.
            </p>
          </div>
          <Button
            asChild
            size="sm"
            className="bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold shrink-0 ml-4"
          >
            <Link href="/plans">Ver planes</Link>
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
          >
            <div className={`${color} mb-2`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold">{fmt(value)}</p>
            <p className="text-zinc-400 text-sm">{label}</p>
          </div>
        ))}
      </div>

      {/* Premium stats teaser */}
      {!isPremium && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8 relative overflow-hidden">
          <div className="absolute inset-0 backdrop-blur-[1px] bg-zinc-950/50 flex items-center justify-center z-10 rounded-xl">
            <div className="text-center">
              <Zap className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="font-bold text-white mb-1">Estadísticas avanzadas</p>
              <p className="text-zinc-400 text-sm mb-4">Disponibles en planes Basic y Premium</p>
              <Button asChild size="sm" className="bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold">
                <Link href="/plans">Desbloquear</Link>
              </Button>
            </div>
          </div>
          <div className="filter blur-sm pointer-events-none">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              <h2 className="font-semibold">Vistas por día</h2>
            </div>
            <div className="flex items-end gap-2 h-24">
              {[30, 50, 45, 70, 60, 80, 90, 65, 75, 55, 85, 95, 70, 88].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-amber-400/30 rounded-t"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {isPremium && (
        <Link href="/dashboard/stats">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-8 flex items-center gap-3 hover:border-amber-400/40 transition-colors cursor-pointer">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            <div>
              <p className="font-semibold">Ver estadísticas detalladas</p>
              <p className="text-zinc-400 text-sm">Vistas, reservas y tendencias de tu galería</p>
            </div>
          </div>
        </Link>
      )}

      {/* My designs */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">
            Mis diseños activos
            <span className="ml-2 text-sm font-normal text-zinc-500">
              {designs.length}/{userPlan === "studio" ? 80 : userPlan === "pro" || userPlan === "premium" ? 30 : userPlan === "basic" ? 15 : 5} slots
            </span>
          </h2>
          <Link href={`/artist/${profile.username}`} className="text-amber-400 text-sm hover:underline">
            Ver perfil público →
          </Link>
        </div>

        {designs.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {designs.map((design) => (
              <DesignActions key={design.id} design={design} userPlan={userPlan} pinnedCount={pinnedCount} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500">
            <ImageIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No tenés diseños activos</p>
            <Button asChild className="mt-4 bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold" size="sm">
              <Link href="/dashboard/upload">Subir diseño</Link>
            </Button>
          </div>
        )}
      </div>

      {/* Archived designs — pro/studio only */}
      {userPlan !== "free" && (
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            Archivo
            {archivedDesigns.length > 0 && (
              <span className="text-sm font-normal text-zinc-500">{archivedDesigns.length} diseños</span>
            )}
          </h2>
          {archivedDesigns.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {archivedDesigns.map((design) => (
                <DesignActions key={design.id} design={design} userPlan={userPlan} pinnedCount={pinnedCount} />
              ))}
            </div>
          ) : (
            <div className="py-8 bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl text-center text-zinc-600 text-sm">
              Los diseños que archives aparecen aquí. Podés restaurarlos cuando quieras.
            </div>
          )}
        </div>
      )}

      {/* Recent reservations */}
      <div>
        <h2 className="text-lg font-bold mb-4">Reservas recientes</h2>
        {reservations && reservations.filter((r) => r.status === "pending").length > 0 ? (
          <div className="space-y-3">
            {reservations.filter((r) => r.status === "pending").map((res) => {
              const status = statusConfig[res.status as keyof typeof statusConfig];
              const StatusIcon = status.icon;
              return (
                <div
                  key={res.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
                >
                  {/* Top row: image + info */}
                  <div className="flex items-start gap-3 mb-3">
                    {res.design?.image_url && (
                      <div className="relative shrink-0">
                        <img
                          src={res.design.image_url}
                          alt={res.design.title ?? ""}
                          className="w-14 h-14 rounded-lg object-cover"
                        />
                        {(res.status === "confirmed" || res.status === "completed") && (
                          <div className="absolute inset-0 bg-zinc-950/60 rounded-lg flex items-center justify-center">
                            <span className="text-[9px] font-bold text-red-400 leading-tight text-center px-1">RESERVADO</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {res.design?.title ?? "Diseño"}
                      </p>
                      <p className="text-zinc-400 text-xs mt-0.5">
                        por <span className="text-white">{(res.client as any)?.full_name ?? "Cliente"}</span>
                      </p>
                      {res.preferred_date && (
                        <p className="text-zinc-500 text-xs mt-0.5">{res.preferred_date}</p>
                      )}
                      {res.message && (
                        <p className="text-zinc-500 text-xs mt-1 line-clamp-2">"{res.message}"</p>
                      )}
                    </div>
                  </div>
                  {/* Bottom row: status + actions */}
                  <div className="flex items-center justify-between gap-2">
                    <Badge className={`text-xs border ${status.className}`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {status.label}
                    </Badge>
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/messages?user=${(res.client as any)?.id}`}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 hover:text-white transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Responder
                      </Link>
                      <ReservationActions
                        reservationId={res.id}
                        designId={res.design_id}
                        currentStatus={res.status}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500">
            <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Sin reservas todavía</p>
          </div>
        )}
      </div>
    </div>
    <EarlyBirdWelcome earlyBird={profile.early_bird ?? false} />
    </>
  );
}

// Server component can't do interactive, so we use a small client component inline via a separate file
function ReservationActions({
  reservationId,
  designId,
  currentStatus,
}: {
  reservationId: string;
  designId: string;
  currentStatus: string;
}) {
  if (currentStatus !== "pending") return null;
  return (
    <div className="flex gap-1.5">
      <form
        action={async () => {
          "use server";
          const supabase = await createClient();
          await Promise.all([
            supabase.from("reservations").update({ status: "confirmed" }).eq("id", reservationId),
            supabase.from("designs").update({ is_available: false }).eq("id", designId),
          ]);
          revalidatePath("/dashboard");
        }}
      >
        <button
          type="submit"
          className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs hover:bg-emerald-500/30 transition-colors"
        >
          Reservar
        </button>
      </form>
      <form
        action={async () => {
          "use server";
          const supabase = await createClient();
          await supabase.from("reservations").update({ status: "rejected" }).eq("id", reservationId);
          revalidatePath("/dashboard");
        }}
      >
        <button
          type="submit"
          className="px-2.5 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30 transition-colors"
        >
          Rechazar
        </button>
      </form>
    </div>
  );
}
