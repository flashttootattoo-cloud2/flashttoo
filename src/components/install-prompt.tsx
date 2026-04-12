"use client";

import { useEffect, useState } from "react";
import { Share, Plus } from "lucide-react";

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
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
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-4">


      <div className="flex items-start gap-3 mb-3 pr-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Flashttoo" className="w-10 h-10 rounded-xl shrink-0 object-contain bg-zinc-800 p-1" />
        <div>
          <p className="font-semibold text-white text-sm">Instalá Flashttoo</p>
          <p className="text-zinc-400 text-xs mt-0.5">
            {isIOS
              ? "Agregala a tu pantalla de inicio para abrirla como una app"
              : "Instalala en tu celular para acceder más rápido"}
          </p>
        </div>
      </div>

      {isIOS ? (
        // iOS: guide with steps (Safari doesn't allow programmatic install)
        <div className="bg-zinc-800 rounded-xl p-3 space-y-2">
          <p className="text-xs text-zinc-400 font-medium uppercase tracking-wide mb-2">Cómo instalar</p>
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
      ) : (
        <button
          onClick={installAndroid}
          className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold text-sm rounded-xl transition-colors"
        >
          Instalar app
        </button>
      )}
    </div>
  );
}
