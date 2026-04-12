"use client";

import { useState, useEffect } from "react";
import { Bookmark, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface SaveButtonProps {
  designId: string;
  designTitle: string;
  designImage?: string;
  artistId: string;
  userId: string;
  initialSaved: boolean;
  initialCount: number;
}

const lsKey = (uid: string, did: string) => `saved:${uid}:${did}`;

export function SaveButton({ designId, designTitle, designImage, artistId, userId, initialSaved, initialCount }: SaveButtonProps) {
  const supabase = createClient();

  const [saved, setSaved]       = useState(initialSaved);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    // Check localStorage first — instant, no network
    if (localStorage.getItem(lsKey(userId, designId)) === "1") {
      setSaved(true);
      setChecking(false);
      return;
    }

    supabase
      .from("design_likes")
      .select("id")
      .eq("design_id", designId)
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        const isSaved = !!data;
        if (isSaved) localStorage.setItem(lsKey(userId, designId), "1");
        setSaved(isSaved);
        setChecking(false);
      });
  }, [designId, userId]);

  if (checking) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-zinc-900/70 text-zinc-500 text-xs font-semibold">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  if (saved) return null;

  const handleSave = async () => {
    if (loading || artistId === userId) return;
    setLoading(true);

    const { error } = await supabase
      .from("design_likes")
      .upsert({ user_id: userId, design_id: designId }, { onConflict: "user_id,design_id", ignoreDuplicates: true });

    if (error) {
      toast.error("No se pudo guardar el diseño.");
      setLoading(false);
      return;
    }

    // Persist en localStorage para que no reaparezca tras navegación
    localStorage.setItem(lsKey(userId, designId), "1");

    // Actualizar contador
    await supabase
      .from("designs")
      .update({ likes_count: initialCount + 1 })
      .eq("id", designId);

    setSaved(true);

    // Notificar al artista
    if (artistId !== userId) {
      const ch = supabase.channel(`user-notify:${artistId}`);
      ch.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          ch.send({
            type: "broadcast",
            event: "design_saved",
            payload: { designTitle, designId, saveCount: initialCount + 1 },
          }).then(() => supabase.removeChannel(ch));
        }
      });
    }

    // Notificar a otros clientes que también guardaron
    fetch("/api/design/notify-savers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ designId, designTitle, designImage: designImage ?? null, saverId: userId }),
    });

    setLoading(false);
  };

  return (
    <button
      onClick={handleSave}
      disabled={loading}
      aria-label="Guardar diseño"
      className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-zinc-900/70 text-zinc-300 hover:bg-amber-400 hover:text-zinc-900 backdrop-blur-sm transition-all text-xs font-semibold disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bookmark className="w-4 h-4" />}
      {loading ? "" : "Guardar"}
    </button>
  );
}
