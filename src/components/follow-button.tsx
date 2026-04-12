"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface FollowButtonProps {
  artistId: string;
  userId: string | null;
  initialFollowing: boolean;
  initialCount: number;
}

export function FollowButton({ artistId, userId, initialFollowing, initialCount }: FollowButtonProps) {
  const supabase = createClient();
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (!userId) { router.push("/auth/login"); return; }
    setLoading(true);

    if (following) {
      setFollowing(false);
      setCount((c) => Math.max(0, c - 1));
      await supabase.from("follows")
        .delete()
        .eq("follower_id", userId)
        .eq("following_id", artistId);
    } else {
      setFollowing(true);
      setCount((c) => c + 1);
      await supabase.from("follows")
        .insert({ follower_id: userId, following_id: artistId });
    }
    setLoading(false);
  };

  if (following) {
    return (
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
            <span className="group-hover:hidden">Siguiendo · {count}</span>
            <span className="hidden group-hover:inline">Dejar de seguir</span>
          </>
        )}
      </Button>
    );
  }

  return (
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
          Seguir · {count}
        </>
      )}
    </Button>
  );
}
