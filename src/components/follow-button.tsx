"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck, Loader2, Bell } from "lucide-react";
import { useRouter } from "next/navigation";

interface FollowButtonProps {
  artistId: string;
  artistName: string;
  userId: string | null;
  initialFollowing: boolean;
}

export function FollowButton({ artistId, artistName, userId, initialFollowing }: FollowButtonProps) {
  const supabase = createClient();
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const doFollow = async () => {
    setLoading(true);
    setFollowing(true);
    await supabase.from("follows")
      .insert({ follower_id: userId, following_id: artistId });
    fetch("/api/follow/notify-artist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artistId }),
    }).catch(() => {});
    setLoading(false);
  };

  const handleToggle = async () => {
    if (!userId) { router.push("/auth/login"); return; }

    if (following) {
      setLoading(true);
      setFollowing(false);
      await supabase.from("follows")
        .delete()
        .eq("follower_id", userId)
        .eq("following_id", artistId);
      setLoading(false);
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div
            className="relative z-10 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-full bg-amber-400/10 flex items-center justify-center mb-4">
              <Bell className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="font-semibold text-white text-lg mb-2">Seguir a {artistName}</h3>
            <p className="text-zinc-400 text-sm mb-6">
              Vas a recibir notificaciones cuando {artistName} suba un diseño nuevo o confirme una reserva.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-zinc-700 hover:bg-zinc-800"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold"
                onClick={() => { setShowModal(false); doFollow(); }}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Seguir
              </Button>
            </div>
          </div>
        </div>
      )}

      {following ? (
        <Button
          onClick={handleToggle}
          disabled={loading}
          variant="outline"
          className="border-zinc-700 hover:border-red-500 hover:text-red-400 hover:bg-red-500/10 transition-all group"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <UserCheck className="w-4 h-4 mr-2 group-hover:hidden" />
              <span className="group-hover:hidden">Siguiendo</span>
              <span className="hidden group-hover:inline">Dejar de seguir</span>
            </>
          )}
        </Button>
      ) : (
        <Button
          onClick={handleToggle}
          disabled={loading}
          variant="outline"
          className="border-zinc-700 hover:bg-zinc-800"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <UserPlus className="w-4 h-4 mr-2" />
              Seguir
            </>
          )}
        </Button>
      )}
    </>
  );
}
