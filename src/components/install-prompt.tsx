"use client";

import { useEffect, useState } from "react";
import { Share, Plus, ChevronUp, ChevronDown } from "lucide-react";

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [expanded, setExpanded] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Already installed as standalone — don't show
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // Already installed via prompt
    if (localStorage.getItem("install-dismissed")) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isMobile = ios || /android/i.test(navigator.userAgent);
    setIsIOS(ios);

    // Show immediately on any mobile device
    if (isMobile) setShow(true);

    // Also listen for Android native install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isMobile) setShow(true); // desktop fallback
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const installAndroid = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") localStorage.setItem("install-dismissed", "1");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">

      {/* Collapsed header — always visible, tap to expand */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Flashttoo" className="w-8 h-8 rounded-xl shrink-0 object-contain bg-zinc-800 p-1" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm leading-tight">Instalá Flashttoo</p>
          <p className="text-zinc-400 text-xs mt-0.5 truncate">
            {isIOS ? "Agregala a tu pantalla de inicio" : "Instalala en tu celular"}
          </p>
        </div>
        {expanded
          ? <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
          : <ChevronUp className="w-4 h-4 text-zinc-400 shrink-0" />}
      </button>

      {/* Expanded instructions */}
      {expanded && (
        <div className="px-4 pb-4 pt-1">
          {isIOS ? (
            <div className="bg-zinc-800 rounded-xl p-3 space-y-2">
              <p className="text-xs text-zinc-400 font-medium uppercase tracking-wide mb-2">Cómo instalar en iPhone</p>
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <span className="w-5 h-5 rounded-full bg-amber-400 text-zinc-900 text-xs font-bold flex items-center justify-center shrink-0">1</span>
                Tocá el botón <Share className="w-4 h-4 text-blue-400 inline mx-1 shrink-0" /> en Safari
              </div>
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <span className="w-5 h-5 rounded-full bg-amber-400 text-zinc-900 text-xs font-bold flex items-center justify-center shrink-0">2</span>
                Elegí <span className="font-medium text-white mx-1">"Agregar a pantalla de inicio"</span>
                <Plus className="w-4 h-4 text-zinc-400 shrink-0" />
              </div>
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <span className="w-5 h-5 rounded-full bg-amber-400 text-zinc-900 text-xs font-bold flex items-center justify-center shrink-0">3</span>
                Tocá <span className="font-medium text-white ml-1">"Agregar"</span>
              </div>
            </div>
          ) : deferredPrompt ? (
            <button
              onClick={installAndroid}
              className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold text-sm rounded-xl transition-colors"
            >
              Instalar app
            </button>
          ) : (
            <div className="bg-zinc-800 rounded-xl p-3 space-y-2">
              <p className="text-xs text-zinc-400 font-medium uppercase tracking-wide mb-2">Cómo instalar en Android</p>
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <span className="w-5 h-5 rounded-full bg-amber-400 text-zinc-900 text-xs font-bold flex items-center justify-center shrink-0">1</span>
                Tocá el menú <span className="font-medium text-white mx-1">⋮</span> de Chrome
              </div>
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <span className="w-5 h-5 rounded-full bg-amber-400 text-zinc-900 text-xs font-bold flex items-center justify-center shrink-0">2</span>
                Elegí <span className="font-medium text-white mx-1">"Agregar a pantalla de inicio"</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <span className="w-5 h-5 rounded-full bg-amber-400 text-zinc-900 text-xs font-bold flex items-center justify-center shrink-0">3</span>
                Tocá <span className="font-medium text-white ml-1">"Instalar"</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
