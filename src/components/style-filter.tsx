"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useRef, useEffect } from "react";

const styles = [
  "Todos", "Black & Grey", "Neo Traditional", "Japonés", "Blackwork",
  "Fineline", "Watercolor", "Tribal", "Geométrico", "Old School",
  "Realismo", "Lettering", "Sketch",
];

export function StyleFilter() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeStyle = searchParams.get("style");

  const rowRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const drag = useRef({ active: false, startX: 0, scrollLeft: 0 });

  // Scroll activo al centro cuando cambia el filtro
  useEffect(() => {
    const btn = activeRef.current;
    const row = rowRef.current;
    if (!btn || !row) return;
    const btnCenter = btn.offsetLeft + btn.offsetWidth / 2;
    row.scrollTo({ left: btnCenter - row.offsetWidth / 2, behavior: "smooth" });
  }, [activeStyle]);

  function onMouseDown(e: React.MouseEvent) {
    const el = rowRef.current;
    if (!el) return;
    drag.current = { active: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
    el.style.cursor = "grabbing";
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!drag.current.active) return;
    const el = rowRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    el.scrollLeft = drag.current.scrollLeft - (x - drag.current.startX);
  }

  function onMouseUp() {
    drag.current.active = false;
    if (rowRef.current) rowRef.current.style.cursor = "grab";
  }

  function handleSelect(style: string) {
    // Only navigate if it wasn't a drag
    const href = style === "Todos" ? "/" : `/?style=${encodeURIComponent(style)}`;
    router.push(href, { scroll: false });
  }

  return (
    <div className="sticky top-16 z-40 bg-zinc-950 -mx-4 mb-6 border-b border-zinc-900 relative">
      {/* fade left */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-zinc-950 to-transparent z-10" />
      {/* fade right */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-zinc-950 to-transparent z-10" />

      <div
        ref={rowRef}
        className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-2.5 select-none"
        style={{ cursor: "grab" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {styles.map((style) => {
          const isActive = (!activeStyle && style === "Todos") || activeStyle === style;
          return (
            <button
              key={style}
              ref={isActive ? activeRef : null}
              onClick={() => handleSelect(style)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-amber-400 text-zinc-900"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
              }`}
            >
              {style}
            </button>
          );
        })}
      </div>
    </div>
  );
}
