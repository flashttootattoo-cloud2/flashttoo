"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import type { PlanType } from "@/types/database";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Trash2,
  CheckCircle,
  Circle,
  Loader2,
  MoreVertical,
  Archive,
  ArchiveRestore,
  Pin,
  PinOff,
  Scissors,
  Bookmark,
  Pencil,
} from "lucide-react";
import { fmt } from "@/lib/utils";

interface DesignActionsProps {
  design: {
    id: string;
    title: string;
    image_url: string;
    is_available: boolean;
    is_archived: boolean;
    is_pinned: boolean;
    is_admin_hidden?: boolean;
    likes_count?: number | null;
  };
  userPlan: PlanType;
  pinnedCount: number;
}

export function DesignActions({ design, userPlan, pinnedCount }: DesignActionsProps) {
  const supabase = createClient();
  const router = useRouter();
  const [available, setAvailable]   = useState(design.is_available);
  const [archived, setArchived]     = useState(design.is_archived);
  const [pinned, setPinned]         = useState(design.is_pinned);
  const [menuOpen, setMenuOpen]     = useState(false);
  const [loadingToggle, setLoadingToggle] = useState(false);
  const [confirmDelete, setConfirmDelete]   = useState(false);
  const [confirmTatuado, setConfirmTatuado] = useState(false);
  const [deleting, setDeleting]             = useState(false);

  const canArchive = userPlan !== "free";
  const canPin     = userPlan === "pro" || userPlan === "studio" || userPlan === "premium";
  const maxPins    = userPlan === "studio" ? 5 : 3;
  const canAddPin  = canPin && (pinnedCount < maxPins || pinned); // can toggle off always

  const toggleAvailable = async () => {
    setMenuOpen(false);
    setLoadingToggle(true);
    const next = !available;
    const { error } = await supabase.from("designs").update({ is_available: next }).eq("id", design.id);
    if (error) { toast.error("No se pudo actualizar el estado."); }
    else { setAvailable(next); toast.success(next ? "Diseño disponible." : "Diseño marcado como reservado."); }
    setLoadingToggle(false);
  };

  const toggleArchived = async () => {
    setMenuOpen(false);
    setLoadingToggle(true);
    const next = !archived;
    const { error } = await supabase.from("designs").update({ is_archived: next }).eq("id", design.id);
    if (error) { toast.error("No se pudo archivar el diseño."); }
    else {
      setArchived(next);
      toast.success(next ? "Diseño archivado. Solo vos lo ves." : "Diseño restaurado al feed.");
      router.refresh();
    }
    setLoadingToggle(false);
  };

  const togglePinned = async () => {
    setMenuOpen(false);
    if (!pinned && pinnedCount >= maxPins) {
      toast.error(`Ya tenés ${maxPins} diseños fijados. Quitá uno antes.`);
      return;
    }
    setLoadingToggle(true);
    const next = !pinned;
    const { error } = await supabase.from("designs").update({ is_pinned: next }).eq("id", design.id);
    if (error) { toast.error("No se pudo fijar el diseño."); }
    else { setPinned(next); toast.success(next ? "Diseño fijado al tope de tu perfil." : "Diseño desfijado."); router.refresh(); }
    setLoadingToggle(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase.from("designs").delete().eq("id", design.id);
    if (error) { toast.error("No se pudo eliminar el diseño."); setDeleting(false); }
    else { toast.success("Diseño eliminado."); setConfirmDelete(false); router.refresh(); }
  };

  const handleTatuado = async () => {
    setDeleting(true);
    const { error } = await supabase.from("designs").delete().eq("id", design.id);
    if (error) { toast.error("No se pudo liberar el slot."); setDeleting(false); }
    else { toast.success("¡Slot liberado! Ya podés subir un diseño nuevo."); setConfirmTatuado(false); router.refresh(); }
  };

  return (
    <>
      <div className="relative aspect-square rounded-xl overflow-hidden bg-zinc-800">
        <Link href={`/design/${design.id}`}>
          <img src={design.image_url} alt={design.title} className="w-full h-full object-cover" />
        </Link>

        {/* Overlays */}
        {design.is_admin_hidden && (
          <div className="absolute inset-0 bg-zinc-950/80 flex items-center justify-center pointer-events-none z-10">
            <Badge className="bg-red-500/20 text-red-400 border border-red-500/40 text-xs">Oculto por administración</Badge>
          </div>
        )}
        {archived && !design.is_admin_hidden && (
          <div className="absolute inset-0 bg-zinc-950/70 flex items-center justify-center pointer-events-none">
            <Badge className="bg-zinc-700 text-zinc-300 text-xs border-0">Archivado</Badge>
          </div>
        )}
        {!archived && !available && (
          <>
            <div className="absolute inset-0 bg-zinc-950/50 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <Badge className="bg-red-500 text-white text-xs border-0 whitespace-nowrap">Reservado</Badge>
            </div>
            {/* Botón liberar slot — visible directo, sin abrir menú */}
            <button
              onClick={(e) => { e.preventDefault(); setConfirmTatuado(true); }}
              className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1 py-1.5 bg-amber-400/90 hover:bg-amber-400 text-zinc-900 text-xs font-semibold transition-colors"
            >
              <Scissors className="w-3 h-3" />
              Tatuado · liberar slot
            </button>
          </>
        )}
        {pinned && !archived && (
          <div className="absolute top-1.5 left-1.5 pointer-events-none">
            <Pin className="w-3.5 h-3.5 text-amber-400 drop-shadow" />
          </div>
        )}
        {(design.likes_count ?? 0) > 0 && !archived && available && (
          <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 bg-zinc-900/80 backdrop-blur-sm rounded-full px-1.5 py-0.5 pointer-events-none">
            <Bookmark className="w-2.5 h-2.5 text-amber-400 fill-current" />
            <span className="text-[10px] text-amber-400 font-semibold leading-none">{fmt(design.likes_count!)}</span>
          </div>
        )}
        {loadingToggle && (
          <div className="absolute inset-0 bg-zinc-950/60 flex items-center justify-center pointer-events-none">
            <Loader2 className="w-5 h-5 animate-spin text-white" />
          </div>
        )}

        {/* Menu button — hidden if admin locked */}
        <button
          onClick={(e) => { e.preventDefault(); if (!design.is_admin_hidden) setMenuOpen((o) => !o); }}
          className={`absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center text-white hover:bg-zinc-800 transition-colors ${design.is_admin_hidden ? "opacity-30 cursor-not-allowed" : ""}`}
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute top-9 right-1.5 z-20 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl overflow-hidden min-w-[175px]">

              {/* Toggle available — only if not archived */}
              {!archived && (
                <button
                  onClick={toggleAvailable}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-zinc-700 transition-colors text-left"
                >
                  {available
                    ? <><Circle className="w-4 h-4 text-amber-400 shrink-0" /> Marcar reservado</>
                    : <><CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> Marcar disponible</>}
                </button>
              )}

              {/* Pin — premium only */}
              {canPin && !archived && (
                <button
                  onClick={togglePinned}
                  disabled={!canAddPin}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-zinc-700 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {pinned
                    ? <><PinOff className="w-4 h-4 text-zinc-400 shrink-0" /> Desfijar</>
                    : <><Pin className="w-4 h-4 text-amber-400 shrink-0" /> Fijar al tope {pinnedCount >= maxPins && "(lleno)"}</>}
                </button>
              )}

              {/* Archive — basic/premium only */}
              {canArchive ? (
                <button
                  onClick={toggleArchived}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-zinc-700 transition-colors text-left"
                >
                  {archived
                    ? <><ArchiveRestore className="w-4 h-4 text-emerald-400 shrink-0" /> Restaurar al feed</>
                    : <><Archive className="w-4 h-4 text-zinc-400 shrink-0" /> Archivar</>}
                </button>
              ) : (
                /* Teaser for free users */
                <Link
                  href="/plans"
                  onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-zinc-700 transition-colors text-left text-zinc-500"
                >
                  <Archive className="w-4 h-4 shrink-0" />
                  Archivar <span className="ml-auto text-[10px] bg-amber-400/20 text-amber-400 px-1.5 py-0.5 rounded">Basic+</span>
                </Link>
              )}

              <Link
                href={`/dashboard/edit/${design.id}`}
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-zinc-700 transition-colors text-left"
              >
                <Pencil className="w-4 h-4 text-zinc-400 shrink-0" />
                Editar
              </Link>

              <div className="h-px bg-zinc-700" />
              <button
                onClick={() => { setMenuOpen(false); setConfirmDelete(true); }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-400 hover:bg-zinc-700 transition-colors text-left"
              >
                <Trash2 className="w-4 h-4 shrink-0" />
                Eliminar
              </button>
            </div>
          </>
        )}
      </div>

      <Dialog open={confirmTatuado} onOpenChange={setConfirmTatuado}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Ya lo tatuaste?</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Se eliminará "{design.title}" y el slot quedará libre para subir un diseño nuevo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" onClick={() => setConfirmTatuado(false)} className="flex-1 border-zinc-700 hover:bg-zinc-800" disabled={deleting}>
              Cancelar
            </Button>
            <Button onClick={handleTatuado} disabled={deleting} className="flex-1 bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sí, liberar slot"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminar este diseño?</DialogTitle>
            <DialogDescription className="text-zinc-400">
              "{design.title}" será eliminado permanentemente. No se puede deshacer.
              {canArchive && " Considerá archivarlo si querés conservarlo."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" onClick={() => setConfirmDelete(false)} className="flex-1 border-zinc-700 hover:bg-zinc-800" disabled={deleting}>
              Cancelar
            </Button>
            <Button onClick={handleDelete} disabled={deleting} className="flex-1 bg-red-500 hover:bg-red-600 text-white">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Eliminar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
