"use client";

import { useState, useRef, useEffect } from "react";
import { MoreVertical, Flag, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const REASONS = [
  "Cuenta falsa o suplantación de identidad",
  "No cumple con los términos de uso",
  "Contenido inapropiado o engañoso",
  "Spam o conducta abusiva",
  "Otro",
];

export function ArtistReportButton({
  artistId,
  artistName,
  userId,
}: {
  artistId: string;
  artistName: string;
  userId: string | null;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleReport = async () => {
    if (!userId) { router.push("/auth/login"); return; }
    if (!reason) { toast.error("Seleccioná un motivo"); return; }
    setLoading(true);
    const res = await fetch("/api/profile/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reported_id: artistId, reason }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error ?? "Error al reportar");
    } else {
      setModalOpen(false);
      setReason("");
      toast.success("Reporte enviado. Lo revisaremos pronto.");
    }
  };

  return (
    <>
      {/* Report modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative z-10 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Flag className="w-4 h-4 text-red-400" />
                </div>
                <h3 className="font-semibold text-white">Reportar a {artistName}</h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-zinc-400 text-sm mb-4">
              ¿Por qué estás reportando este perfil? Solo podés reportarlo una vez cada 7 días.
            </p>
            <div className="space-y-2 mb-5">
              {REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors border ${
                    reason === r
                      ? "bg-red-500/10 border-red-500/40 text-red-300"
                      : "border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReport}
                disabled={loading || !reason}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-500/90 hover:bg-red-500 text-white font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar reporte"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3-dot button + dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="w-8 h-8 flex items-center justify-center rounded-full border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-10 z-40 w-52 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden">
            <button
              onClick={() => { setMenuOpen(false); if (!userId) { router.push("/auth/login"); return; } setModalOpen(true); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-zinc-800 transition-colors"
            >
              <Flag className="w-4 h-4 shrink-0" />
              Reportar perfil
            </button>
          </div>
        )}
      </div>
    </>
  );
}
