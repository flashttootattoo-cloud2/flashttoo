"use client";

import Image from "next/image";
import Link from "next/link";
import { Bookmark, MapPin, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fmt } from "@/lib/utils";
import type { Design } from "@/types/database";

interface DesignCardProps {
  design: Design;
  priority?: boolean;
}

export function DesignCard({ design, priority = false }: DesignCardProps) {
  return (
    <div className="group relative break-inside-avoid mb-4">
      <Link href={`/design/${design.id}`}>
        <div className="relative overflow-hidden rounded-2xl bg-zinc-900 cursor-pointer">
          <div className="relative w-full">
            <Image
              src={design.image_url}
              alt={design.title}
              width={400}
              height={600}
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
              style={{ aspectRatio: "auto" }}
              priority={priority}
            />

            {/* Top badges */}
            <div className="absolute top-3 left-3 flex gap-1.5">
              {!design.is_available && (
                <Badge className="bg-red-500/90 text-white text-xs border-0">Reservado</Badge>
              )}
            </div>

            {/* Bottom info — siempre visible */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-zinc-950/90 to-transparent">
              <div className="flex items-end justify-between gap-2">
                <h3 className="font-semibold text-white text-sm truncate">{design.title}</h3>
                {(design.likes_count ?? 0) > 0 && (
                  <div className="flex items-center gap-1 text-zinc-300 text-xs shrink-0">
                    <Bookmark className="w-3 h-3 fill-current text-amber-400" />
                    {fmt(design.likes_count!)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Artist footer */}
      {design.artist && (
        <Link
          href={`/artist/${design.artist.username}`}
          className="flex items-center gap-2 mt-2 px-1 group/artist"
        >
          <Avatar className="w-6 h-6">
            <AvatarImage src={design.artist.avatar_url ?? ""} />
            <AvatarFallback className="bg-amber-400 text-zinc-900 text-xs">
              {design.artist.full_name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-zinc-400 group-hover/artist:text-white transition-colors truncate">
            {design.artist.full_name}
          </span>
          {design.artist.plan === "studio" && <CheckCircle className="w-3 h-3 text-blue-400 shrink-0" />}
          {(design.artist.plan === "pro" || design.artist.plan === "premium") && <CheckCircle className="w-3 h-3 text-amber-400 shrink-0" />}
          {design.artist.plan === "basic" && <CheckCircle className="w-2.5 h-2.5 text-emerald-400 shrink-0" />}
          {design.artist.city && (
            <div className="flex items-center gap-0.5 text-zinc-500 text-xs ml-auto shrink-0">
              <MapPin className="w-3 h-3" />
              {design.artist.city}
            </div>
          )}
        </Link>
      )}
    </div>
  );
}
