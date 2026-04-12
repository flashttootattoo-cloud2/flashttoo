"use client";

import Link from "next/link";
import Image from 'next/image';
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home,
  Search,
  MessageSquare,
  LayoutDashboard,
  LogOut,
  User,
  Zap,
  Menu,
  X,
  Download,
  Share,
  Bookmark,
  Bell,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

async function registerPush(_userId: string) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;

  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const existing = await reg.pushManager.getSubscription();
    const sub = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    });

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });
  } catch { /* silently ignore – push is optional */ }
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { user, profile, unreadCount, notifCount, setUser, setProfile, incrementUnread, clearUnread, incrementNotif, setNotifCount, clearNotif, clear } = useAuthStore();
  const [mobileOpen, setMobileOpen]     = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isIOS, setIsIOS]               = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [saveNotif, setSaveNotif]       = useState<{ designTitle: string; designId: string; count: number } | null>(null);
  const saveNotifTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathnameRef = useRef(pathname);
  const [notifOpen, setNotifOpen]       = useState(false);
  const [notifs, setNotifs]             = useState<{ id: string; design_id: string; design_title: string; design_image: string | null; saves_count: number; read: boolean; created_at: string }[]>([]);

  // Auth init
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        supabase.from("profiles").select("*").eq("id", user.id).single()
          .then(({ data }) => { if (data) setProfile(data); });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          supabase.from("profiles").select("*").eq("id", session.user.id).single()
            .then(({ data }) => { if (data) setProfile(data); });
        } else {
          clear();
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // Load notifications — espera a que profile esté disponible para saber el role
  useEffect(() => {
    if (!user || !profile) return;
    if (profile.role === "tattoo_artist") return;

    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) {
          setNotifs(data as any);
          setNotifCount(data.filter((n: any) => !n.read).length);
        }
      });
  }, [user?.id, profile?.role]);

  // Unread messages + push setup
  useEffect(() => {
    if (!user) return;

    // Register push subscription (asks permission once)
    registerPush(user.id);

    // Initial unread count
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .neq("sender_id", user.id)
      .then(({ count }) => {
        if ((count ?? 0) > 0 && pathname !== "/messages") {
          // We don't have per-conversation filter here, just a rough count
          // The realtime will keep it updated
        }
      });

    // Broadcast: the sender notifies this user's personal channel
    const channel = supabase
      .channel(`user-notify:${user.id}`)
      .on("broadcast", { event: "new_message" }, (payload) => {
        if (pathnameRef.current !== "/messages") {
          incrementUnread();
          if (Notification.permission === "granted") {
            new Notification(`Mensaje de ${payload.payload?.senderName ?? "alguien"}`, {
              body: payload.payload?.preview ?? "Tenés un mensaje nuevo",
              icon: "/favicon.ico",
            });
          }
        }
      })
      .on("broadcast", { event: "new_notification" }, (payload) => {
        const { designId, designTitle, designImage, savesCount } = payload.payload ?? {};
        const newNotif = {
          id: crypto.randomUUID(),
          design_id: designId,
          design_title: designTitle,
          design_image: designImage ?? null,
          saves_count: savesCount,
          read: false,
          created_at: new Date().toISOString(),
        };
        setNotifs((prev) => [newNotif, ...prev.filter((n) => n.design_id !== designId)]);
        incrementNotif();
      })
      .on("broadcast", { event: "design_saved" }, (payload) => {
        const { designTitle, designId, saveCount } = payload.payload ?? {};
        setSaveNotif({ designTitle, designId, count: saveCount });
        if (saveNotifTimer.current) clearTimeout(saveNotifTimer.current);
        saveNotifTimer.current = setTimeout(() => setSaveNotif(null), 6000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (saveNotifTimer.current) clearTimeout(saveNotifTimer.current);
    };
  }, [user]);

  // Keep ref in sync so realtime callback always reads current pathname
  useEffect(() => {
    pathnameRef.current = pathname;
    if (pathname === "/messages") clearUnread();
  }, [pathname]);

  // PWA install detection
  useEffect(() => {
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const openNotifs = async () => {
    setNotifOpen(true);
    if (notifCount > 0 && user) {
      clearNotif();
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
      await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clear();
    router.push("/");
  };

  const navLinks = [
    { href: "/", icon: Home, label: "Inicio" },
    { href: "/explore", icon: Search, label: "Explorar" },
    ...(user ? [{ href: "/messages", icon: MessageSquare, label: "Mensajes" }] : []),
    ...(user && profile?.role === "tattoo_artist"
      ? [{ href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/">
  <Image src="/logo.png" alt="flashtto" width={160} height={40} priority className="h-9 w-auto" />
</Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
              {href === "/messages" && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-full focus:outline-none">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={profile?.avatar_url ?? ""} />
                  <AvatarFallback className="bg-amber-400 text-zinc-900 text-xs font-bold">
                    {profile?.full_name?.[0]?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
                {profile?.plan === "studio" && (
                  <Badge variant="secondary" className="hidden sm:flex bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">Estudio</Badge>
                )}
                {(profile?.plan === "pro" || profile?.plan === "premium") && (
                  <Badge variant="secondary" className="hidden sm:flex bg-amber-400/20 text-amber-400 border-amber-400/30 text-xs">Pro</Badge>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-white">
                <div className="px-2 py-1.5 text-sm">
                  <p className="font-medium">{profile?.full_name ?? "Usuario"}</p>
                  <p className="text-zinc-400 text-xs">@{profile?.username ?? ""}</p>
                </div>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem
                  onClick={() => router.push(profile?.role === "tattoo_artist" ? `/artist/${profile.username}` : "/profile")}
                  className="cursor-pointer"
                >
                  <User className="w-4 h-4 mr-2" /> Mi perfil
                </DropdownMenuItem>
                {profile?.role === "tattoo_artist" && (
                  <DropdownMenuItem onClick={() => router.push("/dashboard")} className="cursor-pointer">
                    <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                  </DropdownMenuItem>
                )}
                {profile?.role !== "administradorgeneral" && (
                  <DropdownMenuItem onClick={() => router.push("/plans")} className="cursor-pointer">
                    <Zap className="w-4 h-4 mr-2" /> Planes
                  </DropdownMenuItem>
                )}
                {profile?.role === "administradorgeneral" && (
                  <DropdownMenuItem onClick={() => router.push("/admin")} className="cursor-pointer text-amber-400">
                    <ShieldCheck className="w-4 h-4 mr-2" /> Panel Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem onClick={handleLogout} className="text-red-400 cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" /> Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Button variant="ghost" asChild className="text-zinc-400 hover:text-white">
                <Link href="/auth/login">Iniciar sesión</Link>
              </Button>
              <Button asChild className="bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold">
                <Link href="/auth/register">Registrarse</Link>
              </Button>
            </div>
          )}

          {/* Bell — solo clientes */}
          {user && profile?.role !== "tattoo_artist" && (
            <div className="relative">
              <button
                onClick={openNotifs}
                className="relative p-2 text-zinc-400 hover:text-white transition-colors"
                aria-label="Notificaciones"
              >
                <Bell className="w-5 h-5" />
                {notifCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-amber-400 text-zinc-900 text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                    {notifCount > 9 ? "9+" : notifCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-10 z-50 w-80 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                      <p className="font-semibold text-sm">Notificaciones</p>
                      <button onClick={() => setNotifOpen(false)}>
                        <X className="w-4 h-4 text-zinc-500 hover:text-white" />
                      </button>
                    </div>
                    {notifs.length === 0 ? (
                      <div className="px-4 py-8 text-center text-zinc-500 text-sm">
                        Sin notificaciones todavía
                      </div>
                    ) : (
                      <div className="max-h-80 overflow-y-auto">
                        {notifs.map((n) => (
                          <Link
                            key={n.id}
                            href={`/design/${n.design_id}`}
                            onClick={() => setNotifOpen(false)}
                            className={`flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 transition-colors ${!n.read ? "bg-amber-400/5" : ""}`}
                          >
                            {n.design_image ? (
                              <img src={n.design_image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-zinc-800 shrink-0 flex items-center justify-center">
                                <Bookmark className="w-4 h-4 text-zinc-600" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{n.design_title}</p>
                              <p className="text-xs text-amber-400">{n.saves_count} personas lo tienen guardado — reservá primero.</p>
                            </div>
                            {!n.read && <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Messages shortcut — mobile only, visible without opening menu */}
          {user && (
            <Link
              href="/messages"
              className="relative md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
              aria-label="Mensajes"
            >
              <MessageSquare className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          )}

          {/* Mobile menu toggle */}
          <button
            className="md:hidden text-zinc-400 hover:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Save notification banner (artist-only, auto-dismisses) */}
      {saveNotif && (
        <div className="border-t border-amber-400/20 bg-amber-400/10 px-4 py-2.5 flex items-center gap-3">
          <Bookmark className="w-4 h-4 text-amber-400 shrink-0 fill-current" />
          <p className="flex-1 text-sm text-amber-300">
            <span className="font-semibold">¡Diseño caliente!</span>{" "}
            Alguien guardó{" "}
            <Link
              href={`/design/${saveNotif.designId}`}
              className="underline underline-offset-2 hover:text-white"
              onClick={() => setSaveNotif(null)}
            >
              {saveNotif.designTitle}
            </Link>
            {saveNotif.count > 1 && (
              <span className="text-zinc-400"> · {saveNotif.count} guardados</span>
            )}
          </p>
          <button
            onClick={() => setSaveNotif(null)}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-zinc-800 bg-zinc-950 px-4 py-3 flex flex-col gap-1">
          {navLinks.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                pathname === href ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
              {href === "/messages" && unreadCount > 0 && (
                <span className="ml-auto min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          ))}
          {!user && (
            <>
              <Link href="/auth/login" onClick={() => setMobileOpen(false)} className="px-3 py-2.5 text-sm text-zinc-400 hover:text-white">
                Iniciar sesión
              </Link>
              <Link href="/auth/register" onClick={() => setMobileOpen(false)} className="px-3 py-2.5 text-sm font-semibold text-amber-400">
                Registrarse gratis
              </Link>
            </>
          )}

          {/* Instalar app — solo si no está ya instalada */}
          {!isStandalone && (
            <div className="mt-1 border-t border-zinc-800 pt-2">
              {installPrompt ? (
                // Android: botón que dispara el prompt nativo
                <button
                  onClick={async () => {
                    installPrompt.prompt();
                    const { outcome } = await installPrompt.userChoice;
                    if (outcome === "accepted") setInstallPrompt(null);
                    setMobileOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-amber-400 hover:bg-zinc-800 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Instalar app
                </button>
              ) : isIOS ? (
                // iPhone: toggle guía de pasos
                <>
                  <button
                    onClick={() => setShowIOSGuide((v) => !v)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-amber-400 hover:bg-zinc-800 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Instalar app
                  </button>
                  {showIOSGuide && (
                    <div className="mx-3 mb-2 bg-zinc-800 rounded-xl p-3 space-y-2 text-sm text-zinc-300">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-400 text-zinc-900 text-xs font-bold flex items-center justify-center shrink-0">1</span>
                        Tocá el ícono <Share className="w-4 h-4 text-blue-400 mx-1 shrink-0" /> de Safari
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-400 text-zinc-900 text-xs font-bold flex items-center justify-center shrink-0">2</span>
                        <span>Elegí <strong className="text-white">"Agregar a inicio"</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-400 text-zinc-900 text-xs font-bold flex items-center justify-center shrink-0">3</span>
                        <span>Tocá <strong className="text-white">"Agregar"</strong></span>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
