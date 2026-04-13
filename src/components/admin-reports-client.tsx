"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import { Flag, Loader2, Trash2, EyeOff, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import Link from "next/link";

interface Report {
  id: string;
  reason: string | null;
  created_at: string;
  design: {
    id: string;
    title: string;
    image_url: string;
    is_admin_hidden: boolean;
    artist: { full_name: string; username: string } | null;
  } | null;
  reporter: { full_name: string; username: string } | null;
}

interface GroupedReport {
  design: Report["design"];
  reports: Report[];
}

export function AdminReportsClient() {
  const [groups, setGroups] = useState<GroupedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [confirmHide, setConfirmHide] = useState<GroupedReport | null>(null);
  const [confirmDismiss, setConfirmDismiss] = useState<GroupedReport | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/reports");
    const { reports } = await res.json();

    // Group by design_id
    const map: Record<string, GroupedReport> = {};
    for (const r of (reports ?? []) as Report[]) {
      if (!r.design) continue;
      const key = r.design.id;
      if (!map[key]) map[key] = { design: r.design, reports: [] };
      map[key].reports.push(r);
    }
    setGroups(Object.values(map).sort((a, b) => b.reports.length - a.reports.length));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleHide = async (group: GroupedReport) => {
    const res = await fetch("/api/admin/update-design", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ designId: group.design!.id, is_admin_hidden: true }),
    });
    const { error } = await res.json();
    if (error) { toast.error("No se pudo ocultar: " + error); return; }
    toast.success("Diseño ocultado");
    setConfirmHide(null);
    load();
  };

  const handleDismiss = async (group: GroupedReport) => {
    await fetch("/api/admin/reports", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ design_id: group.design!.id }),
    });
    toast.success("Reportes descartados");
    setConfirmDismiss(null);
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-20 text-zinc-500">
        <Flag className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No hay reportes pendientes</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {confirmHide && (
        <ConfirmDialog
          title={`Ocultar "${confirmHide.design?.title}"`}
          description="El diseño quedará bloqueado y no será visible para nadie excepto el artista. Los reportes se eliminarán."
          onConfirm={() => handleHide(confirmHide)}
          onCancel={() => setConfirmHide(null)}
        />
      )}
      {confirmDismiss && (
        <ConfirmDialog
          title="Descartar reportes"
          description="Se eliminarán todos los reportes de este diseño sin ocultarlo. Hacé esto si el contenido es apropiado."
          onConfirm={() => handleDismiss(confirmDismiss)}
          onCancel={() => setConfirmDismiss(null)}
        />
      )}

      {groups.map((group) => {
        const isExpanded = expanded[group.design!.id];
        return (
          <div key={group.design!.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-4 p-4">
              {/* Thumbnail */}
              <img
                src={group.design!.image_url}
                alt={group.design!.title}
                className="w-16 h-16 rounded-xl object-cover shrink-0"
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm text-white truncate">{group.design!.title}</p>
                  {group.design!.is_admin_hidden && (
                    <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">Oculto</span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  por @{group.design!.artist?.username ?? "—"}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Flag className="w-3 h-3 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400">
                    {group.reports.length} {group.reports.length === 1 ? "reporte" : "reportes"}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 shrink-0">
                <Link
                  href={`/design/${group.design!.id}`}
                  target="_blank"
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Ver
                </Link>
                {!group.design!.is_admin_hidden && (
                  <button
                    onClick={() => setConfirmHide(group)}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    Ocultar
                  </button>
                )}
                <button
                  onClick={() => setConfirmDismiss(group)}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Descartar
                </button>
              </div>
            </div>

            {/* Expandable reporters list */}
            <button
              onClick={() => setExpanded((prev) => ({ ...prev, [group.design!.id]: !isExpanded }))}
              className="w-full flex items-center justify-between px-4 py-2.5 border-t border-zinc-800 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
            >
              <span>Ver quién reportó</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {isExpanded && (
              <div className="border-t border-zinc-800 divide-y divide-zinc-800/60">
                {group.reports.map((r) => (
                  <div key={r.id} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <p className="text-xs text-zinc-300">
                        {r.reporter?.full_name ?? "Usuario desconocido"}
                        <span className="text-zinc-600 ml-1">@{r.reporter?.username}</span>
                      </p>
                      {r.reason && <p className="text-[11px] text-zinc-500 mt-0.5">{r.reason}</p>}
                    </div>
                    <p className="text-[10px] text-zinc-600">
                      {new Date(r.created_at).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
