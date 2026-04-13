"use client";

import { useState } from "react";
import { MoreHorizontal, Flag, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const REASONS = [
  "No es contenido de tatuaje",
  "Contenido ofensivo o explícito",
  "Spam o publicidad",
  "Imagen robada / sin crédito",
  "Otro",
];

export function ReportButton({ designId, userId }: { designId: string; userId: string | null }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  if (!userId) return null;

  const handleReport = async () => {
    if (!selected) return;
    setSending(true);
    const res = await fetch("/api/reports/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ design_id: designId, reason: selected }),
    });
    const json = await res.json();
    setSending(false);
    if (json.already) {
      toast.info("Ya reportaste este diseño anteriormente.");
      setOpen(false);
      return;
    }
    if (json.ok) {
      setDone(true);
    } else {
      toast.error(json.error ?? "No se pudo enviar el reporte.");
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center w-8 h-8 rounded-full text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
        title="Más opciones"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={() => { setOpen(false); setSelected(null); setDone(false); }} />
          <div className="relative z-10 w-full sm:max-w-sm bg-amber-400 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-amber-600/40" />
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-b border-amber-500/40">
              <p className="font-semibold text-sm text-zinc-900">Opciones</p>
              <button onClick={() => { setOpen(false); setSelected(null); setDone(false); }} className="text-zinc-700 hover:text-zinc-900">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 py-4">
              {done ? (
                <div className="text-center py-4">
                  <Flag className="w-8 h-8 text-zinc-900 mx-auto mb-3" />
                  <p className="font-semibold text-zinc-900 mb-1">Reporte enviado</p>
                  <p className="text-sm text-zinc-700">Gracias. El equipo de Flashttoo lo va a revisar.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <Flag className="w-4 h-4 text-zinc-900 shrink-0" />
                    <p className="text-sm font-semibold text-zinc-900">Reportar contenido inapropiado</p>
                  </div>
                  <p className="text-xs text-zinc-700 mb-3">¿Por qué querés reportar este diseño?</p>
                  <div className="space-y-2 mb-4">
                    {REASONS.map((reason) => (
                      <button
                        key={reason}
                        onClick={() => setSelected(reason)}
                        className={cn(
                          "w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                          selected === reason
                            ? "bg-zinc-900 text-amber-400"
                            : "bg-amber-300/50 text-zinc-900 hover:bg-amber-300"
                        )}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleReport}
                    disabled={!selected || sending}
                    className="w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-amber-400 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar reporte"}
                  </button>
                </>
              )}
            </div>

            {!done && (
              <div className="px-4 pb-4">
                <button
                  onClick={() => { setOpen(false); setSelected(null); }}
                  className="w-full py-2.5 rounded-xl text-zinc-700 text-sm font-medium hover:bg-amber-300/50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            )}
            {done && (
              <div className="px-4 pb-4">
                <button
                  onClick={() => { setOpen(false); setDone(false); setSelected(null); }}
                  className="w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-amber-400 text-sm font-semibold transition-colors"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
