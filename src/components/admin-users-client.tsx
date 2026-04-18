"use client";

import React, { useState, useTransition, useEffect } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Ban, CheckCircle, ExternalLink, ChevronDown, MessageSquare, MoreVertical, EyeOff, Eye, Trash2, X, Loader2, ShieldCheck } from "lucide-react";
import { computeTrustScore, trustLabel, trustColor } from "@/lib/trust-score";
import { toast } from "sonner";

interface AdminUser {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  bio?: string | null;
  instagram?: string | null;
  role: string;
  plan: string;
  is_blocked: boolean;
  city: string | null;
  country: string | null;
  created_at: string;
  followers_count?: number | null;
  trust_score_manual?: number | null;
  is_verified?: boolean | null;
}

export function AdminUsersClient({
  users,
  initialQ,
  initialRole,
}: {
  users: AdminUser[];
  initialQ: string;
  initialRole: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [role, setRole] = useState(initialRole);
  const [pending, startTransition] = useTransition();
  const [localUsers, setLocalUsers] = useState<AdminUser[]>(users);
  const [trustModalUser, setTrustModalUser] = useState<AdminUser | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [confirmBlock, setConfirmBlock] = useState<{ userId: string; name: string; isBlocked: boolean } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ userId: string; name: string } | null>(null);

  const search = (newQ: string, newRole: string) => {
    const params = new URLSearchParams();
    if (newQ) params.set("q", newQ);
    if (newRole !== "all") params.set("role", newRole);
    startTransition(() => router.push(`/admin/usuarios?${params.toString()}`));
  };

  const deleteUser = async (userId: string) => {
    const res = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) { toast.error("Error al eliminar usuario"); return; }
    setLocalUsers((prev) => prev.filter((u) => u.id !== userId));
    setConfirmDelete(null);
    toast.success("Usuario eliminado");
  };

  const toggleBlock = async (userId: string, currentBlocked: boolean) => {
    const res = await fetch("/api/admin/block-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, block: !currentBlocked }),
    });
    if (!res.ok) { toast.error("Error al actualizar"); return; }
    setLocalUsers((prev) =>
      prev.map((u) => u.id === userId ? { ...u, is_blocked: !currentBlocked } : u)
    );
    setConfirmBlock(null);
    toast.success(currentBlocked ? "Usuario desbloqueado" : "Usuario bloqueado");
  };

  const roleBadge = (r: string) => {
    if (r === "tattoo_artist") return <Badge className="bg-amber-400/10 text-amber-400 border-amber-400/30 text-xs">Tatuador</Badge>;
    if (r === "administradorgeneral") return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-xs">Admin</Badge>;
    return <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-xs">Cliente</Badge>;
  };

  return (
    <div>
      {trustModalUser && (
        <TrustModal
          user={trustModalUser}
          onClose={() => setTrustModalUser(null)}
          onUpdate={(manual, isVerified) => {
            setLocalUsers((prev) =>
              prev.map((u) =>
                u.id === trustModalUser.id
                  ? { ...u, trust_score_manual: manual, is_verified: isVerified }
                  : u
              )
            );
            setTrustModalUser((prev) =>
              prev ? { ...prev, trust_score_manual: manual, is_verified: isVerified } : null
            );
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={`Eliminar a ${confirmDelete.name}`}
          description="Se eliminará la cuenta, perfil, diseños y todos los datos asociados. Esta acción no se puede deshacer."
          confirmLabel="Eliminar usuario"
          onConfirm={() => deleteUser(confirmDelete.userId)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {confirmBlock && (
        <ConfirmDialog
          title={confirmBlock.isBlocked ? `Desbloquear a ${confirmBlock.name}` : `Bloquear a ${confirmBlock.name}`}
          description={
            confirmBlock.isBlocked
              ? "El usuario volverá a tener acceso y su contenido aparecerá en la plataforma."
              : "Se pausará la cuenta. El usuario verá un aviso y su contenido dejará de aparecer en la plataforma."
          }
          confirmLabel={confirmBlock.isBlocked ? "Desbloquear" : "Bloquear cuenta"}
          onConfirm={() => toggleBlock(confirmBlock.userId, confirmBlock.isBlocked)}
          onCancel={() => setConfirmBlock(null)}
        />
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Buscar por nombre o usuario..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search(q, role)}
            className="pl-9 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
          />
        </div>
        <select
          value={role}
          onChange={(e) => { setRole(e.target.value); search(q, e.target.value); }}
          className="bg-zinc-900 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none"
        >
          <option value="all">Todos los roles</option>
          <option value="client">Clientes</option>
          <option value="tattoo_artist">Tatuadores</option>
        </select>
        <Button
          onClick={() => search(q, role)}
          disabled={pending}
          className="bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold"
          size="sm"
        >
          Buscar
        </Button>
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-4 text-sm text-zinc-500">
        <span><strong className="text-white">{localUsers.length}</strong> usuarios</span>
        <span><strong className="text-white">{localUsers.filter(u => u.is_blocked).length}</strong> bloqueados</span>
        <span><strong className="text-white">{localUsers.filter(u => u.role === "tattoo_artist").length}</strong> tatuadores</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 border-b border-zinc-800">
            <tr>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Usuario</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden md:table-cell">Rol</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden lg:table-cell">Ciudad</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden sm:table-cell">Plan</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden md:table-cell">Confianza</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Estado</th>
              <th className="text-right px-4 py-3 text-zinc-400 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {localUsers.map((user) => (
              <React.Fragment key={user.id}>
                <tr className={`hover:bg-zinc-900/50 transition-colors ${user.is_blocked ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarImage src={user.avatar_url ?? ""} />
                        <AvatarFallback className="bg-amber-400 text-zinc-900 text-xs font-bold">
                          {user.full_name?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-white">{user.full_name}</p>
                        <p className="text-zinc-500 text-xs">@{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">{roleBadge(user.role)}</td>
                  <td className="px-4 py-3 text-zinc-400 hidden lg:table-cell">
                    {[user.city, user.country].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-zinc-400 capitalize">{user.plan || "free"}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {user.role === "tattoo_artist" ? (
                      <TrustBadge user={user} onClick={() => setTrustModalUser(user)} />
                    ) : <span className="text-zinc-600 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {user.is_blocked
                      ? <span className="text-red-400 text-xs font-medium">Bloqueado</span>
                      : <span className="text-emerald-400 text-xs font-medium">Activo</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={`/messages?user=${user.id}`}
                        className="p-1.5 text-zinc-500 hover:text-amber-400 transition-colors"
                        title="Enviar mensaje"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </a>
                      {user.role === "tattoo_artist" && (
                        <a
                          href={`/artist/${user.username}`}
                          target="_blank"
                          className="p-1.5 text-zinc-500 hover:text-white transition-colors"
                          title="Ver perfil"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                        className="p-1.5 text-zinc-500 hover:text-white transition-colors"
                        title="Ver diseños"
                      >
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedUser === user.id ? "rotate-180" : ""}`} />
                      </button>
                      <button
                        onClick={() => setConfirmBlock({ userId: user.id, name: user.full_name, isBlocked: user.is_blocked })}
                        className={`p-1.5 transition-colors ${user.is_blocked ? "text-emerald-400 hover:text-emerald-300" : "text-red-400 hover:text-red-300"}`}
                        title={user.is_blocked ? "Desbloquear cuenta" : "Bloquear cuenta"}
                      >
                        {user.is_blocked ? <CheckCircle className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => setConfirmDelete({ userId: user.id, name: user.full_name })}
                        className="p-1.5 text-zinc-600 hover:text-red-500 transition-colors"
                        title="Eliminar usuario"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedUser === user.id && (
                  <tr key={`${user.id}-designs`}>
                    <td colSpan={7} className="px-4 py-3 bg-zinc-900/30">
                      <AdminUserDesigns userId={user.id} username={user.username} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {localUsers.length === 0 && (
          <div className="text-center py-12 text-zinc-500 text-sm">
            No se encontraron usuarios
          </div>
        )}
      </div>
    </div>
  );
}

function getTrustScore(user: AdminUser) {
  return computeTrustScore({
    created_at: user.created_at,
    avatar_url: user.avatar_url,
    bio: user.bio,
    instagram: user.instagram,
    city: user.city,
    followers_count: user.followers_count,
    total_likes: 0,
    active_designs: 0,
    recent_reports: 0,
    has_reservations: false,
    trust_score_manual: user.trust_score_manual ?? 0,
    is_blocked: user.is_blocked,
    is_verified: user.is_verified ?? false,
  });
}

function TrustBadge({ user, onClick }: { user: AdminUser; onClick: () => void }) {
  const { score } = getTrustScore(user);
  const isVerified = user.is_verified ?? false;
  return (
    <button
      onClick={onClick}
      className="text-left hover:opacity-80 transition-opacity group"
      title="Gestionar confianza"
    >
      <span className={`text-sm font-bold ${trustColor(score, isVerified)}`}>
        {score}<span className="text-zinc-600 text-xs font-normal">/100</span>
      </span>
      <p className={`text-xs font-medium ${trustColor(score, isVerified)}`}>
        ✦ {trustLabel(score, isVerified)}
      </p>
    </button>
  );
}

const MILESTONES = [
  { label: "Nuevo",          min: 0,   color: "text-zinc-500",   bg: "bg-zinc-800" },
  { label: "En crecimiento", min: 40,  color: "text-zinc-300",   bg: "bg-zinc-700" },
  { label: "Confiable",      min: 60,  color: "text-blue-400",   bg: "bg-blue-500/20" },
  { label: "Muy confiable",  min: 80,  color: "text-emerald-400",bg: "bg-emerald-500/20" },
  { label: "Verificado",     min: 100, color: "text-amber-400",  bg: "bg-amber-400/20", verified: true },
];

function TrustModal({
  user,
  onClose,
  onUpdate,
}: {
  user: AdminUser;
  onClose: () => void;
  onUpdate: (manual: number, isVerified: boolean) => void;
}) {
  const { score } = getTrustScore(user);
  const isVerified = user.is_verified ?? false;
  const [manualInput, setManualInput] = useState(user.trust_score_manual ?? 0);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const previewScore = Math.min(
    100,
    Math.max(0, (score - (user.trust_score_manual ?? 0)) + manualInput)
  );

  const saveAdjustment = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/trust-score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, adjustment: manualInput }),
    });
    setSaving(false);
    if (res.ok) {
      onUpdate(manualInput, isVerified);
      toast.success("Score actualizado");
    } else {
      toast.error("Error al actualizar score");
    }
  };

  const toggleVerified = async () => {
    setVerifying(true);
    const next = !isVerified;
    const res = await fetch("/api/admin/trust-score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, is_verified: next }),
    });
    setVerifying(false);
    if (res.ok) {
      onUpdate(user.trust_score_manual ?? 0, next);
      toast.success(next ? "¡Verificado!" : "Verificación removida");
    } else {
      toast.error("Error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-md bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <p className="font-semibold text-white text-sm">Confianza · @{user.username}</p>
            <p className={`text-xs mt-0.5 font-medium ${trustColor(previewScore, isVerified)}`}>
              ✦ {trustLabel(previewScore, isVerified)} · {previewScore}/100
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Milestones */}
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Logros</p>
            <div className="flex gap-2 flex-wrap">
              {MILESTONES.map((m) => {
                const reached = m.verified ? isVerified : previewScore >= m.min;
                return (
                  <span
                    key={m.label}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all
                      ${reached
                        ? `${m.color} ${m.bg} border-current/30`
                        : "text-zinc-600 bg-zinc-800/50 border-zinc-800"
                      }`}
                  >
                    {m.verified && reached && "✓ "}{m.label}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Manual adjustment */}
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Ajuste manual</p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={-100}
                max={100}
                value={manualInput}
                onChange={(e) => setManualInput(Number(e.target.value))}
                className="flex-1 accent-amber-400 h-2 cursor-pointer"
              />
              <input
                type="number"
                min={-100}
                max={100}
                value={manualInput}
                onChange={(e) =>
                  setManualInput(Math.min(100, Math.max(-100, Number(e.target.value))))
                }
                className="w-16 text-center bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-amber-400"
              />
            </div>
            <p className="text-xs text-zinc-600 mt-1">
              Score resultante: <span className={`font-semibold ${trustColor(previewScore, false)}`}>{previewScore}/100</span>
              {manualInput !== 0 && (
                <span className={`ml-1 ${manualInput > 0 ? "text-emerald-400" : "text-red-400"}`}>
                  ({manualInput > 0 ? "+" : ""}{manualInput} manual)
                </span>
              )}
            </p>
          </div>

          {/* Save button */}
          <Button
            onClick={saveAdjustment}
            disabled={saving || manualInput === (user.trust_score_manual ?? 0)}
            className="w-full bg-zinc-700 hover:bg-zinc-600 text-white font-semibold"
            size="sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar ajuste"}
          </Button>

          {/* Divider */}
          <div className="h-px bg-zinc-800" />

          {/* Verify section */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Verificado</p>
              <p className="text-xs text-zinc-500">
                {previewScore < 100 && !isVerified
                  ? `Disponible al llegar a 100 pts (actual: ${previewScore})`
                  : isVerified
                  ? "Este artista tiene verificación manual"
                  : "El score llegó a 100 — podés verificar"}
              </p>
            </div>
            <button
              onClick={toggleVerified}
              disabled={verifying || (previewScore < 100 && !isVerified)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed
                ${isVerified
                  ? "bg-amber-400/20 text-amber-400 border border-amber-400/30 hover:bg-amber-400/30"
                  : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700"
                }`}
            >
              {verifying
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <ShieldCheck className="w-3.5 h-3.5" />}
              {isVerified ? "Quitar" : "Verificar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminUserDesigns({ userId, username }: { userId: string; username: string }) {
  const [designs, setDesigns] = useState<any[] | null>(null);

  useEffect(() => {
    fetch(`/api/admin/user-designs?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => setDesigns(data.designs ?? []));
  }, [userId]);

  if (designs === null) return <p className="text-zinc-500 text-xs py-2">Cargando diseños...</p>;
  if (!designs?.length) return <p className="text-zinc-500 text-xs py-2">Sin diseños publicados.</p>;

  return (
    <div>
      <p className="text-xs text-zinc-500 mb-2">Diseños de @{username}</p>
      <div className="flex flex-wrap gap-2">
        {designs.map((d: any) => (
          <AdminDesignCard key={d.id} design={d} onRemove={(id) => setDesigns((prev) => prev?.filter((x) => x.id !== id) ?? null)} />
        ))}
      </div>
    </div>
  );
}

function AdminDesignCard({ design, onRemove }: { design: any; onRemove: (id: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmHide, setConfirmHide] = useState(false);
  const [hidden, setHidden] = useState<boolean>(design.is_admin_hidden);

  const handleDelete = async () => {
    setLoading(true);
    setConfirmDelete(false);
    setMenuOpen(false);
    const res = await fetch("/api/admin/delete-design", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ designId: design.id }),
    });
    if (res.ok) { toast.success("Diseño eliminado"); onRemove(design.id); }
    else { toast.error("Error al eliminar"); setLoading(false); }
  };

  const handleToggleHidden = async () => {
    setLoading(true);
    setConfirmHide(false);
    setMenuOpen(false);
    const next = !hidden;
    const res = await fetch("/api/admin/update-design", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ designId: design.id, is_admin_hidden: next }),
    });
    if (res.ok) {
      setHidden(next);
      toast.success(next ? "Diseño ocultado" : "Diseño visible");
    } else {
      toast.error("Error al actualizar");
    }
    setLoading(false);
  };

  return (
    <>
      {confirmDelete && (
        <ConfirmDialog
          title={`Eliminar "${design.title}"`}
          description="Esta acción no se puede deshacer."
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
      {confirmHide && (
        <ConfirmDialog
          title={hidden ? `Mostrar "${design.title}"` : `Ocultar "${design.title}"`}
          description={hidden ? "El diseño volverá a ser visible en la plataforma." : "El diseño dejará de aparecer para todos los usuarios."}
          confirmLabel={hidden ? "Mostrar" : "Ocultar"}
          onConfirm={handleToggleHidden}
          onCancel={() => setConfirmHide(false)}
        />
      )}

      {/* Bottom sheet modal */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="relative z-10 w-full sm:max-w-sm bg-amber-400 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-amber-600/40" />
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-amber-500/40">
              <p className="font-semibold text-sm text-zinc-900 truncate">{design.title}</p>
              <button onClick={() => setMenuOpen(false)} className="text-zinc-700 hover:text-zinc-900">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-2">
              <a
                href={`/design/${design.id}`}
                target="_blank"
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-sm hover:bg-amber-300/50 transition-colors text-left text-zinc-900"
              >
                <ExternalLink className="w-5 h-5 text-zinc-700 shrink-0" />
                Ver diseño
              </a>
              <button
                onClick={() => { setMenuOpen(false); setConfirmHide(true); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-sm hover:bg-amber-300/50 transition-colors text-left text-zinc-900"
              >
                {hidden
                  ? <><Eye className="w-5 h-5 text-zinc-700 shrink-0" /><span>Mostrar diseño</span></>
                  : <><EyeOff className="w-5 h-5 text-zinc-700 shrink-0" /><span>Ocultar diseño</span></>}
              </button>
              <div className="h-px bg-amber-500/30 mx-4 my-1" />
              <button
                onClick={() => { setMenuOpen(false); setConfirmDelete(true); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-sm hover:bg-amber-300/50 transition-colors text-left text-red-700"
              >
                <Trash2 className="w-5 h-5 shrink-0" />
                Eliminar diseño
              </button>
            </div>
            <div className="px-4 pb-4 pt-1">
              <button onClick={() => setMenuOpen(false)} className="w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-amber-400 text-sm font-semibold transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative w-20 rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700">
        <img src={design.image_url} alt={design.title} className="w-full h-20 object-cover" />
        {hidden && (
          <div className="absolute inset-0 bg-zinc-950/60 flex items-center justify-center">
            <span className="text-[9px] text-red-400 font-semibold">Oculto</span>
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 bg-zinc-950/70 flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          </div>
        )}
        <button
          onClick={() => setMenuOpen(true)}
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-zinc-900/80 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
        >
          <MoreVertical className="w-3 h-3" />
        </button>
      </div>
    </>
  );
}
