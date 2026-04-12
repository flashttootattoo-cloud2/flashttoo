"use client";

import React, { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Ban, CheckCircle, ExternalLink, ChevronDown, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface AdminUser {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  role: string;
  plan: string;
  is_blocked: boolean;
  city: string | null;
  country: string | null;
  created_at: string;
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
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [confirmBlock, setConfirmBlock] = useState<{ userId: string; name: string; isBlocked: boolean } | null>(null);

  const search = (newQ: string, newRole: string) => {
    const params = new URLSearchParams();
    if (newQ) params.set("q", newQ);
    if (newRole !== "all") params.set("role", newRole);
    startTransition(() => router.push(`/admin/usuarios?${params.toString()}`));
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
                    </div>
                  </td>
                </tr>
                {expandedUser === user.id && (
                  <tr key={`${user.id}-designs`}>
                    <td colSpan={6} className="px-4 py-3 bg-zinc-900/30">
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

function AdminUserDesigns({ userId, username }: { userId: string; username: string }) {
  const [designs, setDesigns] = useState<any[] | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    if (loaded) return;
    const res = await fetch(`/api/admin/user-designs?userId=${userId}`);
    const data = await res.json();
    setDesigns(data.designs ?? []);
    setLoaded(true);
  };

  // Load on mount
  useState(() => { load(); });

  if (!loaded) return <p className="text-zinc-500 text-xs py-2">Cargando diseños...</p>;
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
  const [confirming, setConfirming] = useState(false);
  const [confirmHide, setConfirmHide] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean>(design.is_available);

  const handleDelete = async () => {
    setLoading(true);
    setConfirming(false);
    const res = await fetch("/api/admin/delete-design", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ designId: design.id }),
    });
    if (res.ok) {
      toast.success("Diseño eliminado");
      onRemove(design.id);
    } else {
      toast.error("Error al eliminar");
      setLoading(false);
    }
  };

  const handleToggleAvailable = async () => {
    setLoading(true);
    setConfirmHide(false);
    const next = !isAvailable;
    await fetch("/api/admin/update-design", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ designId: design.id, is_available: next }),
    });
    setIsAvailable(next);
    setLoading(false);
    toast.success(next ? "Diseño visible en la plataforma" : "Diseño ocultado de la plataforma");
  };

  return (
    <>
      {confirming && (
        <ConfirmDialog
          title={`Eliminar "${design.title}"`}
          description="Esta acción no se puede deshacer. El diseño será eliminado permanentemente."
          onConfirm={handleDelete}
          onCancel={() => setConfirming(false)}
        />
      )}
      {confirmHide && (
        <ConfirmDialog
          title={isAvailable ? `Ocultar "${design.title}"` : `Mostrar "${design.title}"`}
          description={
            isAvailable
              ? "El diseño dejará de aparecer en el feed, en el perfil del artista y en búsquedas."
              : "El diseño volverá a ser visible en la plataforma."
          }
          confirmLabel={isAvailable ? "Ocultar" : "Mostrar"}
          onConfirm={handleToggleAvailable}
          onCancel={() => setConfirmHide(false)}
        />
      )}
      <div className="relative group w-20 rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700">
        <img src={design.image_url} alt={design.title} className="w-full h-20 object-cover" />
        {!isAvailable && <div className="absolute inset-0 bg-zinc-950/60 flex items-center justify-center"><span className="text-[9px] text-red-400 font-medium">Oculto</span></div>}
        <div className="absolute inset-0 bg-zinc-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
          <a href={`/design/${design.id}`} target="_blank" className="text-[10px] text-zinc-300 hover:text-white truncate max-w-full px-1 text-center">
            {design.title}
          </a>
          <button
            onClick={() => setConfirmHide(true)}
            disabled={loading}
            className="text-[9px] text-amber-400 hover:text-amber-300"
          >
            {isAvailable ? "Ocultar" : "Mostrar"}
          </button>
          <button
            onClick={() => setConfirming(true)}
            disabled={loading}
            className="text-[9px] text-red-400 hover:text-red-300"
          >
            Eliminar
          </button>
        </div>
      </div>
    </>
  );
}
