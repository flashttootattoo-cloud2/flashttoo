"use client";

import { useState, useEffect } from "react";

function useColumns() {
  const [cols, setCols] = useState(2);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setCols(w >= 1280 ? 5 : w >= 900 ? 4 : w >= 560 ? 3 : 2);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return cols;
}

export function SavedDesignsGrid({ designs, userId }: { designs: any[]; userId: string }) {
  const cols = useColumns();
  return (
    <div style={{ columnCount: cols, columnGap: "1rem" }}>
      {designs.map((d, i) => (
        <SavedDesignCard key={d.id} design={d} userId={userId} index={i} />
      ))}
    </div>
  );
}
import Link from "next/link";
import Image from "next/image";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface SavedDesignCardProps {
  design: {
    id: string;
    title: string;
    image_url: string;
    is_available: boolean;
    likes_count?: number | null;
    price?: number | null;
    currency?: string;
    artist?: { full_name: string; username: string } | null;
  };
  userId: string;
  index: number;
}

export function SavedDesignCard({ design, userId, index }: SavedDesignCardProps) {
  const supabase = createClient();
  const [removed, setRemoved] = useState(false);
  const [loading, setLoading] = useState(false);

  if (removed) return null;

  const handleUnsave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    await supabase.from("design_likes").delete().eq("user_id", userId).eq("design_id", design.id);
    await supabase.from("designs")
      .update({ likes_count: Math.max(0, (design.likes_count ?? 1) - 1) })
      .eq("id", design.id);
    localStorage.removeItem(`saved:${userId}:${design.id}`);
    setRemoved(true);
  };

  return (
    <div style={{ breakInside: "avoid", marginBottom: "1rem" }}>
      <div className={`relative group rounded-2xl overflow-hidden bg-zinc-900 ${(design.likes_count ?? 0) >= 2 && design.is_available ? "ring-2 ring-amber-400/60" : ""}`}>
        <Link href={`/design/${design.id}`}>
          <Image
            src={design.image_url}
            alt={design.title}
            width={400}
            height={600}
            sizes="(min-width: 1024px) 20vw, (min-width: 768px) 25vw, 50vw"
            className="w-full object-cover"
            style={{ aspectRatio: "auto" }}
            priority={index < 6}
          />
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-zinc-950/90 to-transparent">
            <div className="flex items-end justify-between gap-2">
              <p className="text-white text-sm font-semibold truncate">{design.title}</p>
              {design.price && (
                <p className="text-amber-400 text-xs font-semibold shrink-0">
                  ${design.price} {design.currency}
                </p>
              )}
            </div>
            {(design.likes_count ?? 0) >= 2 && design.is_available && (
              <p className="text-amber-400 text-xs mt-0.5 font-medium">
                {design.likes_count} guardados — reservá primero
              </p>
            )}
          </div>
        </Link>

        {/* Botón quitar — siempre visible */}
        <button
          onClick={handleUnsave}
          disabled={loading}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          title="Quitar de guardados"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
