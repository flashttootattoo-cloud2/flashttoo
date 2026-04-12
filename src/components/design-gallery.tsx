"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DesignGalleryProps {
  coverUrl: string;
  title: string;
  extraImages: { id: string; image_url: string; sort_order: number }[];
  isAvailable: boolean;
}

export function DesignGallery({ coverUrl, title, extraImages, isAvailable }: DesignGalleryProps) {
  const allImages = [
    { id: "cover", image_url: coverUrl },
    ...extraImages.sort((a, b) => a.sort_order - b.sort_order),
  ];

  const [activeIndex, setActiveIndex] = useState(0);
  const activeUrl = allImages[activeIndex].image_url;
  const hasMultiple = allImages.length > 1;

  const prev = () => setActiveIndex((i) => (i - 1 + allImages.length) % allImages.length);
  const next = () => setActiveIndex((i) => (i + 1) % allImages.length);

  return (
    <div>
      {/* Main image */}
      <div className="relative rounded-2xl overflow-hidden bg-zinc-900">
        <Image
          src={activeUrl}
          alt={title}
          width={600}
          height={800}
          sizes="(min-width: 768px) 50vw, 100vw"
          className="w-full object-contain max-h-[70vh]"
          priority
        />

        {!isAvailable && (
          <div className="absolute inset-0 bg-zinc-950/60 flex items-center justify-center pointer-events-none">
            <span className="bg-red-500 text-white text-lg font-semibold px-6 py-2 rounded-full">
              Diseño reservado
            </span>
          </div>
        )}

        {/* Arrow navigation — only when multiple images */}
        {hasMultiple && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-zinc-900/70 backdrop-blur-sm flex items-center justify-center text-white hover:bg-zinc-900 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-zinc-900/70 backdrop-blur-sm flex items-center justify-center text-white hover:bg-zinc-900 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Dot indicator */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {allImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === activeIndex ? "bg-white w-4" : "bg-white/40"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {hasMultiple && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {allImages.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActiveIndex(i)}
              className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                i === activeIndex
                  ? "border-amber-400 opacity-100"
                  : "border-transparent opacity-50 hover:opacity-75"
              }`}
            >
              <img src={img.image_url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
