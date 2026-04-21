import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { PlanChangeButton } from "@/components/plan-change-button";
import { PayPalButtons } from "@/components/paypal-buttons";
import type { PlanType } from "@/types/database";

const PAYPAL_PLAN_IDS: Record<string, string> = {
  basic:  process.env.PAYPAL_PLAN_BASIC  ?? "",
  pro:    process.env.PAYPAL_PLAN_PRO    ?? "",
  studio: process.env.PAYPAL_PLAN_STUDIO ?? "",
};
import { Badge } from "@/components/ui/badge";
import {
  Check,
  X,
  Sparkles,
  Zap,
  Building2,
  Archive,
  BarChart2,
  Pin,
  TrendingUp,
  Images,
  Users,
  UserCircle,
  Gift,
} from "lucide-react";

const EARLY_BIRD_LIMIT = 51;

export const planLimits = {
  free:    { activeDesigns: 5,  archive: false, stats: false,   pinned: 0, extraPhotos: false, artistTag: false },
  basic:   { activeDesigns: 15, archive: true,  stats: "basic", pinned: 0, extraPhotos: false, artistTag: false }, // legacy
  pro:     { activeDesigns: 30, archive: true,  stats: "full",  pinned: 3, extraPhotos: true,  artistTag: false },
  premium: { activeDesigns: 30, archive: true,  stats: "full",  pinned: 3, extraPhotos: true,  artistTag: false }, // legacy
  studio:  { activeDesigns: 80, archive: true,  stats: "full",  pinned: 5, extraPhotos: true,  artistTag: true  },
} as const;

const plans = [
  {
    id: "free",
    name: "Gratis",
    price_monthly: 0,
    icon: Sparkles,
    iconColor: "text-zinc-400",
    description: "Para empezar a mostrar tu trabajo",
    borderColor: "border-zinc-700",
    features: [
      { text: "5 diseños activos en el feed", icon: Check, ok: true },
      { text: "Recibir mensajes y reservas", icon: Check, ok: true },
      { text: "Perfil público con galería", icon: Check, ok: true },
      { text: "1 foto por diseño", icon: Check, ok: true },
      { text: "Archivar diseños", icon: X, ok: false },
      { text: "Estadísticas", icon: X, ok: false },
      { text: "Visibilidad prioritaria", icon: X, ok: false },
    ],
  },
  {
    id: "basic",
    name: "Basic",
    price_monthly: 5,
    price_yearly: 45,
    paypal_monthly: "BASIC_MONTHLY_PLAN_ID",
    paypal_yearly: "BASIC_YEARLY_PLAN_ID",
    icon: Check,
    iconColor: "text-emerald-400",
    description: "Para el artista que empieza a crecer",
    borderColor: "border-emerald-500/40",
    features: [
      { text: "15 diseños activos en el feed", icon: Check, ok: true },
      { text: "Recibir mensajes y reservas", icon: Check, ok: true },
      { text: "Archivar y restaurar diseños", icon: Archive, ok: true },
      { text: "Estadísticas básicas (vistas y guardados)", icon: BarChart2, ok: true },
      { text: "Badge Basic verificado ✓", icon: Check, ok: true },
      { text: "Fotos adicionales por diseño", icon: X, ok: false },
      { text: "Diseños fijados al tope del perfil", icon: X, ok: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price_monthly: 10,
    price_yearly: 90,
    paypal_monthly: "PRO_MONTHLY_PLAN_ID",
    paypal_yearly: "PRO_YEARLY_PLAN_ID",
    icon: Zap,
    iconColor: "text-amber-400",
    description: "Para el artista individual con alta demanda",
    borderColor: "border-amber-400/60",
    badge: "Más elegido",
    badgeColor: "bg-amber-400 text-zinc-900",
    ring: true,
    features: [
      { text: "30 diseños activos en el feed", icon: Check, ok: true },
      { text: "Hasta 5 fotos por diseño", icon: Images, ok: true },
      { text: "Archivar y restaurar diseños", icon: Archive, ok: true },
      { text: "Estadísticas avanzadas con tendencias", icon: TrendingUp, ok: true },
      { text: "Posición destacada en el feed", icon: Check, ok: true },
      { text: "3 diseños fijados al tope del perfil", icon: Pin, ok: true },
      { text: "Badge Pro verificado ✓", icon: Check, ok: true },
    ],
  },
  {
    id: "studio",
    name: "Estudio",
    price_monthly: 25,
    price_yearly: 225,
    paypal_monthly: "STUDIO_MONTHLY_PLAN_ID",
    paypal_yearly: "STUDIO_YEARLY_PLAN_ID",
    icon: Building2,
    iconColor: "text-blue-400",
    description: "Para estudios con equipo de tatuadores",
    borderColor: "border-blue-500/50",
    features: [
      { text: "80 diseños activos en el feed", icon: Check, ok: true },
      { text: "Hasta 5 fotos por diseño", icon: Images, ok: true },
      { text: "Archivar y restaurar diseños", icon: Archive, ok: true },
      { text: "Estadísticas avanzadas con tendencias", icon: BarChart2, ok: true },
      { text: "5 diseños fijados al tope del perfil", icon: Pin, ok: true },
      { text: "Etiquetá el tatuador por diseño", icon: UserCircle, ok: true },
      { text: "Posición destacada en el feed", icon: Check, ok: true },
    ],
  },
];

const PLAN_SLOTS: Record<string, number> = { free: 5, basic: 15, pro: 30, premium: 30, studio: 80 };

export default async function PlansPage() {
  const supabase = await createClient();
  const service = createServiceClient();

  const [{ data: { session } }, { count: earlyBirdCount }] = await Promise.all([
    supabase.auth.getSession(),
    service.from("profiles").select("id", { count: "exact", head: true }).eq("early_bird", true),
  ]);

  const earlyBirdTaken = earlyBirdCount ?? 0;
  const earlyBirdLeft = Math.max(0, EARLY_BIRD_LIMIT - earlyBirdTaken);
  const earlyBirdOpen = earlyBirdLeft > 0;

  let currentPlan = "free";
  let activeDesigns = 0;
  let isEarlyBird = false;
  let userId = "";
  if (session?.user) {
    userId = session.user.id;
    const [{ data: profile }, { count }] = await Promise.all([
      supabase.from("profiles").select("plan, early_bird, role").eq("id", session.user.id).single(),
      supabase.from("designs").select("id", { count: "exact", head: true })
        .eq("artist_id", session.user.id).eq("is_archived", false),
    ]);
    const raw = profile?.plan ?? "free";
    currentPlan = raw === "premium" ? "pro" : raw;
    activeDesigns = count ?? 0;
    isEarlyBird = profile?.early_bird ?? false;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-3">
          Elegí tu <span className="text-amber-400">plan</span>
        </h1>
        <p className="text-zinc-400 text-lg max-w-xl mx-auto">
          El límite no es cuántos diseños tenés, sino cuántos mostrás a la vez.
          Rotá, archivá y crecé a tu ritmo.
        </p>
      </div>

      {/* Early Bird Banner */}
      {earlyBirdOpen && !isEarlyBird && (
        <div className="mb-8 bg-gradient-to-r from-amber-400/10 to-amber-400/5 border border-amber-400/30 rounded-2xl px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-white text-lg">Oferta de bienvenida — primeros {EARLY_BIRD_LIMIT}</p>
              <p className="text-zinc-300 text-sm mt-1">
                Los primeros {EARLY_BIRD_LIMIT} tatuadores que se registren reciben el plan <span className="text-emerald-400 font-semibold">Basic gratis</span> para siempre.
                Sin tarjeta. Sin tiempo límite.
              </p>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex-1 bg-zinc-800 rounded-full h-2">
                  <div
                    className="bg-amber-400 h-2 rounded-full transition-all"
                    style={{ width: `${(earlyBirdTaken / EARLY_BIRD_LIMIT) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-amber-400 shrink-0">
                  {earlyBirdLeft} lugar{earlyBirdLeft !== 1 ? "es" : ""} disponible{earlyBirdLeft !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Early Bird ya obtenido — solo mientras el cupo no esté completo */}
      {isEarlyBird && earlyBirdOpen && (
        <div className="mb-8 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-6 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <Gift className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-sm text-emerald-300">
              <span className="font-semibold text-white">Sos parte de los primeros {EARLY_BIRD_LIMIT}.</span>{" "}
              Tu plan Basic está activo de forma gratuita. No necesitás cancelar nada — si querés más funciones, simplemente suscribite a Pro o Studio.
            </p>
          </div>
          <div className="space-y-1">
            <div className="h-2 w-full bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all"
                style={{ width: `${Math.min(100, (earlyBirdTaken / EARLY_BIRD_LIMIT) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-zinc-400">
              {earlyBirdTaken} de {EARLY_BIRD_LIMIT} lugares tomados
              {earlyBirdLeft > 0
                ? ` — quedan ${earlyBirdLeft}`
                : " — cupo completo"}
            </p>
          </div>
        </div>
      )}

      {/* Banner de instrucción para usuarios con plan pago */}
      {currentPlan !== "free" && session?.user && (
        <div className="mb-8 bg-zinc-900 border border-amber-400/20 rounded-2xl px-5 py-4 flex items-start gap-3">
          <span className="text-amber-400 text-xl shrink-0">ℹ️</span>
          <div className="text-sm text-zinc-300 space-y-1">
            <p className="font-semibold text-white">Para cambiar de plan:</p>
            <p>1. Cancelá tu suscripción actual usando el botón de abajo en tu plan activo.</p>
            <p>2. Suscribite al nuevo plan desde esta misma página.</p>
            <p className="text-zinc-500 text-xs">
              Al cancelar tu plan sigue activo hasta fin del período ya pagado.
              Si querés subir de plan de inmediato, podés suscribirte al nuevo antes de que venza —
              se activará enseguida y perderás los días restantes del anterior.
            </p>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = currentPlan === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative bg-zinc-900 border-2 ${plan.borderColor} rounded-2xl p-6 flex flex-col ${
                "ring" in plan && plan.ring ? "ring-2 ring-amber-400/20" : ""
              }`}
            >
              {"badge" in plan && plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className={`${"badgeColor" in plan ? plan.badgeColor : ""} font-semibold border-0 shadow-lg`}>
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <div className="mb-5">
                <Icon className={`w-8 h-8 mb-3 ${plan.iconColor}`} />
                <h2 className="text-xl font-bold">{plan.name}</h2>
                <p className="text-zinc-400 text-sm mt-0.5">{plan.description}</p>
              </div>

              <div className="mb-6">
                {plan.price_monthly === 0 ? (
                  <p className="text-3xl font-bold">Gratis</p>
                ) : (
                  <div>
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-bold">
                        USD {plan.price_monthly}
                      </span>
                      <span className="text-zinc-400 text-sm mb-1">/mes</span>
                    </div>
                    {"price_yearly" in plan && (
                      <p className="text-zinc-500 text-xs mt-0.5">
                        o USD {plan.price_yearly}/año · ahorrás 2 meses
                      </p>
                    )}
                  </div>
                )}
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((f) => {
                  const FIcon = f.icon;
                  return (
                    <li
                      key={f.text}
                      className={`flex items-start gap-2 text-sm ${
                        f.ok ? "text-zinc-300" : "text-zinc-600"
                      }`}
                    >
                      <FIcon
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          f.ok ? "text-emerald-400" : "text-zinc-700"
                        }`}
                      />
                      {f.text}
                    </li>
                  );
                })}
              </ul>

              {isCurrent ? (
                // Plan actual: mostrar badge + botón cancelar si es pago
                <div className="space-y-2">
                  <div className="text-center py-2.5 rounded-xl bg-zinc-800 text-zinc-400 text-sm font-medium">
                    Plan actual
                  </div>
                  {plan.id !== "free" && session?.user && (
                    <PlanChangeButton
                      targetPlan="free"
                      targetName="Gratis"
                      targetSlots={5}
                      currentSlots={PLAN_SLOTS[currentPlan] ?? 5}
                      activeDesigns={activeDesigns}
                      direction="cancel"
                    />
                  )}
                </div>
              ) : plan.id === "free" ? (
                // Free: nunca suscribirse, solo texto
                <div className="text-center py-2.5 rounded-xl bg-zinc-800 text-zinc-500 text-sm">
                  {currentPlan === "free" ? "Siempre gratis" : "Cancelá tu plan para volver aquí"}
                </div>
              ) : session?.user && plan.id !== "free" ? (
                // Plan pago distinto al actual: botón PayPal
                <PayPalButtons
                  planId={PAYPAL_PLAN_IDS[plan.id] ?? ""}
                  planName={plan.name}
                  userId={userId}
                  planType={plan.id as Exclude<PlanType, "free" | "premium">}
                />
              ) : (
                // No logueado
                <a
                  href="/auth/register"
                  className="block text-center py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold text-sm transition-colors"
                >
                  Crear cuenta gratis
                </a>
              )}
            </div>
          );
        })}
      </div>

      {/* Comparison note */}
      <div className="mt-10 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h3 className="font-semibold text-white mb-4 text-center">¿Cómo funciona cada beneficio?</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-zinc-400">
          <div className="flex gap-3">
            <span className="text-2xl">🔄</span>
            <div>
              <p className="text-white font-medium mb-1">Slots activos</p>
              <p>Cuando tatúas y liberás el slot, queda libre para subir un diseño nuevo.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-2xl">📦</span>
            <div>
              <p className="text-white font-medium mb-1">Archivo <span className="text-amber-400">Pro+</span></p>
              <p>Ocultá diseños sin borrarlos. Restauralos cuando los necesitás, como para temporadas.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-2xl">📸</span>
            <div>
              <p className="text-white font-medium mb-1">Fotos adicionales <span className="text-amber-400">Pro+</span></p>
              <p>Subí hasta 5 imágenes por diseño: vista general, detalle, plano cerrado.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-2xl">👤</span>
            <div>
              <p className="text-white font-medium mb-1">Tatuador por diseño <span className="text-blue-400">Estudio</span></p>
              <p>Cada diseño puede mostrar qué artista del estudio lo va a tatuar.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Studio callout */}
      <div className="mt-6 bg-zinc-900 border border-blue-500/20 rounded-2xl p-6 flex items-center gap-4">
        <Users className="w-8 h-8 text-blue-400 shrink-0" />
        <div>
          <p className="font-semibold text-white">¿Tenés un estudio con varios artistas?</p>
          <p className="text-zinc-400 text-sm mt-0.5">
            El plan Estudio te da un perfil único para el local con 80 slots compartidos.
            En cada diseño podés indicar quién lo va a tatuar para que el cliente sepa con quién reserva.
          </p>
        </div>
      </div>

      <p className="mt-8 text-center text-zinc-500 text-sm">
        Pagos procesados de forma segura por PayPal · Cancelá cuando quieras
      </p>
    </div>
  );
}
