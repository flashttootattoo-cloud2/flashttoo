"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import { Flag, Loader2, Trash2, EyeOff, ChevronDown, ChevronUp, ExternalLink, User } from "lucide-react";
import Link from "next/link";

// ─── Design reports ──────────────────────────────────────────────────────────

interface DesignReport {
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

interface GroupedDesignReport {
  design: DesignReport["design"];
  reports: DesignReport[];
}

function DesignReportsTab() {
  const [groups, setGroups] = useState<GroupedDesignReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [confirmHide, setConfirmHide] = useState<GroupedDesignReport | null>(null);
  const [confirmDismiss, setConfirmDismiss] = useState<GroupedDesignReport | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/reports");
    const { reports } = await res.json();
    const map: Record<string, GroupedDesignReport> = {};
    for (const r of (reports ?? []) as DesignReport[]) {
      if (!r.design) continue;
      const key = r.design.id;
      if (!map[key]) map[key] = { design: r.design, reports: [] };
      map[key].reports.push(r);
    }
    setGroups(Object.values(map).sort((a, b) => b.reports.length - a.reports.length));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleHide = async (group: GroupedDesignReport) => {
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

  const handleDismiss = async (group: GroupedDesignReport) => {
    await fetch("/api/admin/reports", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ design_id: group.design!.id }),
    });
    toast.success("Reportes descartados");
    setConfirmDismiss(null);
    load();
  };

  if (loading) return <LoadingSpinner />;
  if (groups.length === 0) return <EmptyState text="No hay reportes de diseños pendientes" />;

  return (
    <div className="space-y-4">
      {confirmHide && (
        <ConfirmDialog
          title={`Ocultar "${confirmHide.design?.title}"`}
          description="El diseño quedará bloqueado y no será visible para nadie excepto el artista."
          onConfirm={() => handleHide(confirmHide)}
          onCancel={() => setConfirmHide(null)}
        />
      )}
      {confirmDismiss && (
        <ConfirmDialog
          title="Descartar reportes"
          description="Se eliminarán todos los reportes de este diseño sin ocultarlo."
          onConfirm={() => handleDismiss(confirmDismiss)}
          onCancel={() => setConfirmDismiss(null)}
        />
      )}

      {groups.map((group) => {
        const isExpanded = expanded[group.design!.id];
        return (
          <div key={group.design!.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-4 p-4">
              <img src={group.design!.image_url} alt={group.design!.title} className="w-16 h-16 rounded-xl object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm text-white truncate">{group.design!.title}</p>
                  {group.design!.is_admin_hidden && (
                    <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">Oculto</span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">por @{group.design!.artist?.username ?? "—"}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Flag className="w-3 h-3 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400">
                    {group.reports.length} {group.reports.length === 1 ? "reporte" : "reportes"}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <Link href={`/design/${group.design!.id}`} target="_blank"
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" /> Ver
                </Link>
                {!group.design!.is_admin_hidden && (
                  <button onClick={() => setConfirmHide(group)}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors">
                    <EyeOff className="w-3.5 h-3.5" /> Ocultar
                  </button>
                )}
                <button onClick={() => setConfirmDismiss(group)}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Descartar
                </button>
              </div>
            </div>

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
                    <p className="text-[10px] text-zinc-600">{new Date(r.created_at).toLocaleDateString("es-AR")}</p>
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

// ─── Profile reports ──────────────────────────────────────────────────────────

interface ProfileReport {
  id: string;
  reason: string | null;
  created_at: string;
  reporter: { full_name: string; username: string } | null;
  reported: { id: string; full_name: string; username: string; avatar_url: string | null; is_blocked: boolean } | null;
}

interface GroupedProfileReport {
  reported: ProfileReport["reported"];
  reports: ProfileReport[];
}

function ProfileReportsTab() {
  const [groups, setGroups] = useState<GroupedProfileReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [confirmDismiss, setConfirmDismiss] = useState<GroupedProfileReport | null>(null);
  const [confirmBlock, setConfirmBlock] = useState<GroupedProfileReport | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/profile-reports");
    const { reports, error } = await res.json();
    if (error) { setLoading(false); return; }
    const map: Record<string, GroupedProfileReport> = {};
    for (const r of (reports ?? []) as ProfileReport[]) {
      if (!r.reported) continue;
      const key = r.reported.id;
      if (!map[key]) map[key] = { reported: r.reported, reports: [] };
      map[key].reports.push(r);
    }
    setGroups(Object.values(map).sort((a, b) => b.reports.length - a.reports.length));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDismiss = async (group: GroupedProfileReport) => {
    await fetch("/api/admin/profile-reports", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reported_id: group.reported!.id }),
    });
    toast.success("Reportes descartados");
    setConfirmDismiss(null);
    load();
  };

  const handleBlock = async (group: GroupedProfileReport) => {
    const res = await fetch("/api/admin/block-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: group.reported!.id, block: true }),
    });
    if (!res.ok) { toast.error("Error al bloquear"); return; }
    // Also dismiss reports
    await fetch("/api/admin/profile-reports", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reported_id: group.reported!.id }),
    });
    toast.success("Cuenta bloqueada y reportes descartados");
    setConfirmBlock(null);
    load();
  };

  if (loading) return <LoadingSpinner />;
  if (groups.length === 0) return <EmptyState text="No hay reportes de perfiles pendientes" />;

  return (
    <div className="space-y-4">
      {confirmDismiss && (
        <ConfirmDialog
          title="Descartar reportes"
          description={`Se descartarán todos los reportes sobre @${confirmDismiss.reported?.username} sin tomar acción.`}
          onConfirm={() => handleDismiss(confirmDismiss)}
          onCancel={() => setConfirmDismiss(null)}
        />
      )}
      {confirmBlock && (
        <ConfirmDialog
          title={`Bloquear a @${confirmBlock.reported?.username}`}
          description="Se pausará la cuenta del artista y se descartarán los reportes."
          confirmLabel="Bloquear cuenta"
          onConfirm={() => handleBlock(confirmBlock)}
          onCancel={() => setConfirmBlock(null)}
        />
      )}

      {groups.map((group) => {
        const isExpanded = expanded[group.reported!.id];
        return (
          <div key={group.reported!.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-4 p-4">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-xl bg-zinc-800 shrink-0 overflow-hidden flex items-center justify-center">
                {group.reported!.avatar_url
                  ? <img src={group.reported!.avatar_url} alt="" className="w-full h-full object-cover" />
                  : <User className="w-6 h-6 text-zinc-600" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm text-white">{group.reported!.full_name}</p>
                  {group.reported!.is_blocked && (
                    <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">Bloqueado</span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">@{group.reported!.username}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Flag className="w-3 h-3 text-red-400" />
                  <span className="text-xs font-semibold text-red-400">
                    {group.reports.length} {group.reports.length === 1 ? "reporte" : "reportes"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <Link href={`/artist/${group.reported!.username}`} target="_blank"
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" /> Ver perfil
                </Link>
                {!group.reported!.is_blocked && (
                  <button onClick={() => setConfirmBlock(group)}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors">
                    <EyeOff className="w-3.5 h-3.5" /> Bloquear
                  </button>
                )}
                <button onClick={() => setConfirmDismiss(group)}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Descartar
                </button>
              </div>
            </div>

            <button
              onClick={() => setExpanded((prev) => ({ ...prev, [group.reported!.id]: !isExpanded }))}
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
                    <p className="text-[10px] text-zinc-600">{new Date(r.created_at).toLocaleDateString("es-AR")}</p>
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

// ─── Shared helpers ───────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-40">
      <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-20 text-zinc-500">
      <Flag className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Tab = "designs" | "profiles";

export function AdminReportsClient() {
  const [tab, setTab] = useState<Tab>("designs");

  useEffect(() => {
    fetch("/api/admin/mark-reports-seen", { method: "POST" }).catch(() => {});
  }, []);

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-zinc-800">
        <button
          onClick={() => setTab("designs")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px
            ${tab === "designs"
              ? "border-amber-400 text-white"
              : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
        >
          Diseños
        </button>
        <button
          onClick={() => setTab("profiles")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px
            ${tab === "profiles"
              ? "border-amber-400 text-white"
              : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
        >
          Perfiles
        </button>
      </div>

      {tab === "designs" ? <DesignReportsTab /> : <ProfileReportsTab />}
    </div>
  );
}
