"use client";

import { useEffect, useState } from "react";
import { DesignCard } from "@/components/design-card";
import type { Design } from "@/types/database";
import { ExternalLink } from "lucide-react";

interface MasonryGridProps {
  designs: (Design & { _isAd?: boolean; id: string; brand_name?: string; contact_url?: string | null; city?: string | null })[];
}

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

export function MasonryGrid({ designs }: MasonryGridProps) {
  const cols = useColumns();

  return (
    <div style={{ columnCount: cols, columnGap: "1rem" }}>
      {designs.map((item, index) => (
        <div key={item.id} style={{ breakInside: "avoid", marginBottom: "1rem" }}>
          {item._isAd ? (
            <AdCard ad={item as { id: string; image_url: string; brand_name: string; contact_url?: string | null; city?: string | null }} />
          ) : (
            <DesignCard design={item} priority={index < 8} />
          )}
        </div>
      ))}
    </div>
  );
}

function trackAd(adId: string, type: "click" | "view") {
  fetch("/api/ads/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adId, type }),
  }).catch(() => {});
}

function AdCard({ ad }: { ad: { id: string; image_url: string; brand_name: string; contact_url?: string | null; city?: string | null } }) {
  // Track view on mount
  useEffect(() => {
    trackAd(ad.id, "view");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ad.id]);

  const inner = (
    <div className="relative rounded-2xl overflow-hidden bg-zinc-900 group">
      <img
        src={ad.image_url}
        alt={ad.brand_name}
        className="w-full object-cover"
        style={{ aspectRatio: "auto" }}
      />
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-zinc-950/90 to-transparent">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-white text-sm font-semibold truncate">{ad.brand_name}</p>
            <span className="text-zinc-500 text-[10px]">Publicidad</span>
          </div>
          {ad.contact_url && (
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          )}
        </div>
      </div>
    </div>
  );

  if (ad.contact_url) {
    return (
      <a
        href={ad.contact_url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={() => trackAd(ad.id, "click")}
      >
        {inner}
      </a>
    );
  }
  return inner;
}
