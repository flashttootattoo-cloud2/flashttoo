"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, AlertTriangle, Archive } from "lucide-react";
import { toast } from "sonner";

interface PlanChangeButtonProps {
  targetPlan: string;
  targetName: string;
  targetSlots: number;
  currentSlots: number;
  activeDesigns: number;
  direction: "downgrade" | "cancel";
}

export function PlanChangeButton({
  targetPlan,
  targetName,
  targetSlots,
  currentSlots,
  activeDesigns,
  direction,
}: PlanChangeButtonProps) {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);

  const willArchive = Math.max(0, activeDesigns - targetSlots);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/plan/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPlan: targetPlan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al cambiar de plan");

      toast.success(
        data.archived > 0
          ? `Plan cambiado. ${data.archived} diseño${data.archived > 1 ? "s" : ""} archivado${data.archived > 1 ? "s" : ""} automáticamente.`
          : direction === "cancel"
          ? "Suscripción cancelada. Ahora estás en el plan Gratis."
          : `Plan cambiado a ${targetName}.`
      );
      setOpen(false);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {direction === "cancel" ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full py-2 rounded-xl border border-zinc-700 hover:border-red-500/50 text-zinc-500 hover:text-red-400 text-xs font-medium transition-colors"
        >
          Cancelar suscripción
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="w-full py-2.5 rounded-xl border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white text-sm font-medium transition-colors"
        >
          Bajar a {targetName}
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              {direction === "cancel" ? "¿Cancelar suscripción?" : `¿Bajar a ${targetName}?`}
            </DialogTitle>
            <DialogDescription className="text-zinc-400 space-y-2 pt-1">
              <span className="block">
                {direction === "cancel"
                  ? `Tu plan vuelve a Gratis (${targetSlots} slots activos).`
                  : `El plan ${targetName} permite ${targetSlots} diseños activos (tenés ${currentSlots} slots ahora).`}
              </span>

              {willArchive > 0 ? (
                <span className="flex items-start gap-2 bg-amber-400/10 border border-amber-400/20 rounded-xl p-3 text-amber-300 text-sm">
                  <Archive className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Tus {willArchive} diseño{willArchive > 1 ? "s" : ""} más antiguo{willArchive > 1 ? "s" : ""}{" "}
                    se van a <strong>archivar automáticamente</strong>. No se borran —
                    podés restaurarlos si volvés a subir de plan.
                  </span>
                </span>
              ) : (
                <span className="block text-zinc-500 text-sm">
                  Todos tus diseños actuales entran dentro del nuevo límite, no se archiva ninguno.
                </span>
              )}

              {direction === "cancel" && (
                <span className="block text-zinc-500 text-sm">
                  El archivo queda congelado hasta que vuelvas a suscribirte.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-3 mt-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="flex-1 border-zinc-700 hover:bg-zinc-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className={`flex-1 font-semibold ${
                direction === "cancel"
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-zinc-700 hover:bg-zinc-600 text-white"
              }`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : direction === "cancel" ? (
                "Sí, cancelar"
              ) : (
                "Confirmar bajada"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
