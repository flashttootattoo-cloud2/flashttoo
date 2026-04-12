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
      <div className="rounded-xl overflow-hidden bg-zinc-800">

        {/* Image */}
        <div className="relative aspect-square">
          <Link href={`/design/${design.id}`}>
            <img src={design.image_url} alt={design.title} className="w-full h-full object-cover" />
          </Link>

          {/* Admin hidden overlay */}
          {design.is_admin_hidden && (
            <div className="absolute inset-0 bg-zinc-950/90 flex flex-col items-center justify-center gap-2 z-10 p-3 text-center">
              <span className="text-red-400 text-2xl">⚠</span>
              <p className="text-red-400 text-xs font-semibold leading-tight">Contenido bloqueado por administración</p>
              <p className="text-zinc-500 text-[10px] leading-tight">No es visible para otros usuarios.</p>
              <button
                onClick={(e) => { e.preventDefault(); setConfirmDelete(true); }}
                className="mt-1 px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-medium transition-colors border border-zinc-700"
              >
                Eliminar diseño
              </button>
            </div>
          )}
          {archived && !design.is_admin_hidden && (
            <div className="absolute inset-0 bg-zinc-950/70 flex items-center justify-center pointer-events-none">
              <Badge className="bg-zinc-700 text-zinc-300 text-xs border-0">Archivado</Badge>
            </div>
          )}
          {!archived && !available && !design.is_admin_hidden && (
            <>
              <div className="absolute inset-0 bg-zinc-950/50 pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <Badge className="bg-red-500 text-white text-xs border-0 whitespace-nowrap">Reservado</Badge>
              </div>
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
            <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-zinc-900/80 backdrop-blur-sm rounded-full px-1.5 py-0.5 pointer-events-none">
              <Bookmark className="w-2.5 h-2.5 text-amber-400 fill-current" />
              <span className="text-[10px] text-amber-400 font-semibold leading-none">{fmt(design.likes_count!)}</span>
            </div>
          )}
          {loadingToggle && (
            <div className="absolute inset-0 bg-zinc-950/60 flex items-center justify-center pointer-events-none">
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            </div>
          )}
        </div>

        {/* Bottom bar */}
        {!design.is_admin_hidden && (
          <div className="flex items-center justify-between px-2 py-1.5">
            <p className="text-xs text-zinc-400 truncate">{design.title}</p>
            <button
              onClick={() => setMenuOpen(true)}
              className="shrink-0 w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Actions modal — bottom sheet style */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="relative z-10 w-full sm:max-w-sm bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-zinc-700" />
            </div>
            <div className="px-4 py-3 border-b border-zinc-800">
              <p className="font-semibold text-sm text-white truncate">{design.title}</p>
            </div>

            <div className="py-2">
              {!archived && (
                <button onClick={toggleAvailable} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm hover:bg-zinc-800 transition-colors text-left">
                  {available
                    ? <><Circle className="w-5 h-5 text-amber-400 shrink-0" /><span>Marcar como reservado</span></>
                    : <><CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" /><span>Marcar como disponible</span></>}
                </button>
              )}
              {canPin && !archived && (
                <button onClick={togglePinned} disabled={!canAddPin} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm hover:bg-zinc-800 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed">
                  {pinned
                    ? <><PinOff className="w-5 h-5 text-zinc-400 shrink-0" /><span>Desfijar</span></>
                    : <><Pin className="w-5 h-5 text-amber-400 shrink-0" /><span>Fijar al tope {pinnedCount >= maxPins && "(lleno)"}</span></>}
                </button>
              )}
              {canArchive ? (
                <button onClick={toggleArchived} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm hover:bg-zinc-800 transition-colors text-left">
                  {archived
                    ? <><ArchiveRestore className="w-5 h-5 text-emerald-400 shrink-0" /><span>Restaurar al feed</span></>
                    : <><Archive className="w-5 h-5 text-zinc-400 shrink-0" /><span>Archivar</span></>}
                </button>
              ) : (
                <Link href="/plans" onClick={() => setMenuOpen(false)} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm hover:bg-zinc-800 transition-colors text-left text-zinc-500">
                  <Archive className="w-5 h-5 shrink-0" />
                  <span>Archivar</span>
                  <span className="ml-auto text-[10px] bg-amber-400/20 text-amber-400 px-1.5 py-0.5 rounded">Basic+</span>
                </Link>
              )}
              <Link href={`/dashboard/edit/${design.id}`} onClick={() => setMenuOpen(false)} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm hover:bg-zinc-800 transition-colors text-left">
                <Pencil className="w-5 h-5 text-zinc-400 shrink-0" />
                <span>Editar diseño</span>
              </Link>
              <div className="h-px bg-zinc-800 mx-4 my-1" />
              <button onClick={() => { setMenuOpen(false); setConfirmDelete(true); }} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-red-400 hover:bg-zinc-800 transition-colors text-left">
                <Trash2 className="w-5 h-5 shrink-0" />
                <span>Eliminar diseño</span>
              </button>
            </div>

            <div className="px-4 pb-4 pt-1">
              <button onClick={() => setMenuOpen(false)} className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-sm font-medium transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

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
