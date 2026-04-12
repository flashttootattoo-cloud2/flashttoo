"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, X } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";

interface ExploreSearchProps {
  defaultCity?: string;
  defaultQ?: string;
}

const CITIES = [
  "Buenos Aires", "Córdoba", "Rosario", "Mendoza", "Mar del Plata",
  "La Plata", "Tucumán", "Salta", "Santa Fe", "Neuquén",
  "Santiago", "Valparaíso", "Concepción",
  "Montevideo", "Bogotá", "Medellín", "Lima", "Ciudad de México",
];

export function ExploreSearch({ defaultCity = "", defaultQ = "" }: ExploreSearchProps) {
  const router = useRouter();
  const [city, setCity] = useState(defaultCity);
  const [q, setQ] = useState(defaultQ);
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const cityRef = useRef<HTMLDivElement>(null);

  // Buscar automáticamente cuando cambia ciudad o q (debounced)
  const search = useDebouncedCallback((newCity: string, newQ: string) => {
    const params = new URLSearchParams();
    if (newCity.trim()) params.set("city", newCity.trim());
    if (newQ.trim())    params.set("q", newQ.trim());
    const qs = params.toString();
    router.push(qs ? `/explore?${qs}` : "/explore");
  }, 500);

  const handleCityChange = (val: string) => {
    setCity(val);
    // Mostrar sugerencias
    if (val.length >= 2) {
      setCitySuggestions(
        CITIES.filter((c) => c.toLowerCase().startsWith(val.toLowerCase())).slice(0, 5)
      );
    } else {
      setCitySuggestions([]);
    }
    search(val, q);
  };

  const handleQChange = (val: string) => {
    setQ(val);
    search(city, val);
  };

  const selectCity = (c: string) => {
    setCity(c);
    setCitySuggestions([]);
    search(c, q);
  };

  const clearCity = () => {
    setCity("");
    setCitySuggestions([]);
    search("", q);
  };

  const clearQ = () => {
    setQ("");
    search(city, "");
  };

  // Cerrar sugerencias al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) {
        setCitySuggestions([]);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      {/* Campo ciudad con autocompletado */}
      <div className="relative flex-1" ref={cityRef}>
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        <input
          value={city}
          onChange={(e) => handleCityChange(e.target.value)}
          placeholder="Ciudad (ej: Buenos Aires)"
          className="w-full h-11 pl-9 pr-9 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
        />
        {city && (
          <button
            onClick={clearCity}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Sugerencias de ciudad */}
        {citySuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden z-20 shadow-xl">
            {citySuggestions.map((c) => (
              <button
                key={c}
                onClick={() => selectCity(c)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors text-left"
              >
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Campo nombre/estilo */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        <input
          value={q}
          onChange={(e) => handleQChange(e.target.value)}
          placeholder="Nombre del tatuador o estilo..."
          className="w-full h-11 pl-9 pr-9 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
        />
        {q && (
          <button
            onClick={clearQ}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
