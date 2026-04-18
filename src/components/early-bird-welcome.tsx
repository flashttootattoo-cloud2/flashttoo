"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Gift, Zap, Archive, BarChart2 } from "lucide-react";

export function EarlyBirdWelcome({ earlyBird }: { earlyBird: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!earlyBird) return;
    if (localStorage.getItem("early_bird_welcomed")) return;
    setOpen(true);
  }, [earlyBird]);

  const handleClose = () => {
    localStorage.setItem("early_bird_welcomed", "1");
    setOpen(false);
  };

  const handlePlans = () => {
    handleClose();
    router.push("/plans");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-md bg-zinc-900 border border-amber-400/30 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header dorado */}
        <div className="bg-gradient-to-br from-amber-400 to-amber-500 px-6 pt-8 pb-6 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="text-2xl font-black text-zinc-900">¡Sos de los primeros!</h2>
          <p className="text-zinc-800 text-sm mt-1 font-medium">
            Entraste al grupo selecto de artistas fundadores de Flashttoo
          </p>
        </div>

        {/* Contenido */}
        <div className="px-6 py-5">
          <div className="flex items-center gap-3 bg-amber-400/10 border border-amber-400/20 rounded-xl p-4 mb-5">
            <Gift className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold text-white text-sm">Plan Basic activado — sin costo</p>
              <p className="text-zinc-400 text-xs mt-0.5">Para siempre, sin tarjeta, sin vencimiento</p>
            </div>
          </div>

          <p className="text-zinc-300 text-sm mb-4 font-medium">Con tu plan Basic tenés:</p>
          <ul className="space-y-2.5 mb-6">
            {[
              { icon: Zap,       text: "15 diseños activos en el feed" },
              { icon: Archive,   text: "Archivar y restaurar diseños" },
              { icon: BarChart2, text: "Estadísticas básicas de vistas y guardados" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2.5 text-sm text-zinc-300">
                <Icon className="w-4 h-4 text-amber-400 shrink-0" />
                {text}
              </li>
            ))}
          </ul>

          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white text-sm font-medium transition-colors"
            >
              Ir al dashboard
            </button>
            <button
              onClick={handlePlans}
              className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-900 text-sm font-bold transition-colors"
            >
              Ver todos los planes
            </button>
          </div>
        </div>

        <button
          onClick={handleClose}
          className="absolute top-3 right-3 text-zinc-800 hover:text-zinc-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
