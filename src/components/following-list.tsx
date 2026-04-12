"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users } from "lucide-react";

interface Artist {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

const INITIAL_LIMIT = 12;

export function FollowingList({ artists }: { artists: Artist[] }) {
  const [expanded, setExpanded] = useState(false);

  if (artists.length === 0) return null;

  const visible = expanded ? artists : artists.slice(0, INITIAL_LIMIT);
  const hasMore = artists.length > INITIAL_LIMIT;

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-400" />
          Tatuadores que seguís
          <span className="text-sm font-normal text-zinc-500">({artists.length})</span>
        </h2>
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-amber-400 hover:underline"
          >
            {expanded ? "Ver menos" : `Ver todos`}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        {visible.map((artist) => (
          <Link
            key={artist.id}
            href={`/artist/${artist.username}`}
            className="flex flex-col items-center gap-1.5 group"
          >
            <Avatar className="w-14 h-14 border-2 border-zinc-700 group-hover:border-amber-400 transition-colors">
              <AvatarImage src={artist.avatar_url ?? ""} />
              <AvatarFallback className="bg-amber-400 text-zinc-900 font-bold">
                {artist.full_name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-zinc-400 group-hover:text-white transition-colors w-14 truncate text-center">
              {artist.full_name?.split(" ")[0]}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
