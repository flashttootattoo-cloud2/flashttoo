"use client";

import Link from "next/link";
import Image from 'next/image';
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  X,
  Menu,
  Download,
  Share,
  Bookmark,
  Bell,
  ShieldCheck,
  CheckCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

async function registerPush(_userId: string) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;

  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const existing = await reg.pushManager.getSubscription();
    if (existing) await existing.unsubscribe();

    const sub = await reg.pushManager.subscribe({
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isIOS, setIsIOS]               = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [saveNotif, setSaveNotif]       = useState<{ designTitle: string; designId: string; count: number } | null>(null);
  const saveNotifTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathnameRef = useRef(pathname);

  // Unified mobile sheet
  const [sheetOpen, setSheetOpen]     = useState(false);
  const [mounted, setMounted]         = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const [notifsExpanded, setNotifsExpanded] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [notifs, setNotifs]           = useState<{ id: string; design_id: string; design_title: string; design_image: string | null; saves_count: number; type?: string; read: boolean; created_at: string }[]>([]);

  // Desktop notif panel
  const [notifOpen, setNotifOpen] = useState(false);

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

  // Load notifications — keep only last 3, delete the rest
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
        if (!data) return;
        const keep = data.slice(0, 3);
        const remove = data.slice(3);
        setNotifs(keep as never);
        setNotifCount(keep.filter((n: { read: boolean }) => !n.read).length);
        if (remove.length > 0) {
          const ids = remove.map((n: { id: string }) => n.id);
          supabase.from("notifications").delete().in("id", ids).then(() => {});
        }
      });
  }, [user?.id, profile?.role]);

  // Unread messages + push setup
  useEffect(() => {
    if (!user) return;
    registerPush(user.id);

    const channel = supabase
      .channel(`user-notify:${user.id}`)
      .on("broadcast", { event: "new_message" }, (payload) => {
        if (pathnameRef.current !== "/messages") {
          incrementUnread();
          if (Notification.permission === "granted") {
            new Notification(`Mensaje de ${payload.payload?.senderName ?? "alguien"}`, {
              body: payload.payload?.preview ?? "Tenés un mensaje nuevo",
              icon: "/icon-notification.png",
            });
          }
        }
      })
      .on("broadcast", { event: "new_notification" }, (payload) => {
        const { designId, designTitle, designImage, savesCount, notifType } = payload.payload ?? {};
        const newNotif = {
          id: crypto.randomUUID(),
          design_id: designId,
          design_title: designTitle,
          design_image: designImage ?? null,
          saves_count: savesCount ?? 0,
          type: notifType ?? "saves",
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

  useEffect(() => {
    pathnameRef.current = pathname;
    if (pathname === "/messages") clearUnread();
  }, [pathname]);

  useEffect(() => {
    setMounted(true);
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Close sheet when touching page content (outside the header)
  useEffect(() => {
    if (!sheetOpen) return;
    const handler = (e: TouchEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setSheetOpen(false);
      }
    };
    document.addEventListener("touchstart", handler, { passive: true });
    return () => document.removeEventListener("touchstart", handler);
  }, [sheetOpen]);

  const markNotifsRead = async () => {
    if (notifCount > 0 && user) {
      clearNotif();
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
      await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    }
  };

  const openDesktopNotifs = async () => {
    setNotifOpen(true);
    await markNotifsRead();
  };

  const openSheet = async () => {
    setSheetOpen(true);
    if (profile?.role !== "tattoo_artist") await markNotifsRead();
  };

  const handleLogout = async () => {
    setSheetOpen(false);
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

  const isClient = profile?.role !== "tattoo_artist" && profile?.role !== "administradorgeneral";

  return (
    <header ref={headerRef} className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/">
          <Image src="/Logoprincipal.svg" alt="Flashttoo" width={160} height={45} priority className="h-9 w-auto" />
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
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {/* Desktop: Bell (clients only) */}
              {isClient && (
                <div className="relative hidden md:block">
                  <button
                    onClick={openDesktopNotifs}
                    className="relative p-2 text-zinc-400 hover:text-white transition-colors"
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
                          <button onClick={() => setNotifOpen(false)}><X className="w-4 h-4 text-zinc-500 hover:text-white" /></button>
                        </div>
                        <NotifList notifs={notifs} onClose={() => setNotifOpen(false)} />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Desktop: Dropdown */}
              <div className="hidden md:block">
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
                    <DropdownMenuItem onClick={() => router.push(profile?.role === "tattoo_artist" ? `/artist/${profile.username}` : "/profile")} className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" /> Mi perfil
                    </DropdownMenuItem>
                    {profile?.role === "tattoo_artist" && (
                      <DropdownMenuItem onClick={() => router.push("/dashboard")} className="cursor-pointer">
                        <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                      </DropdownMenuItem>
                    )}
                    {profile?.role === "tattoo_artist" && (
                      <DropdownMenuItem onClick={() => router.push("/profile")} className="cursor-pointer">
                        <Bookmark className="w-4 h-4 mr-2" /> Guardados
                      </DropdownMenuItem>
                    )}
                    {profile?.role === "tattoo_artist" && (
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
              </div>

              {/* Mobile: messages shortcut */}
              <Link
                href="/messages"
                className="relative md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
              >
                <MessageSquare className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>

              {/* Mobile: avatar button → amber bottom sheet */}
              <button onClick={() => sheetOpen ? setSheetOpen(false) : openSheet()} className="md:hidden relative focus:outline-none">
                <Avatar className="w-9 h-9 border-2 border-zinc-700">
                  <AvatarImage src={profile?.avatar_url ?? ""} />
                  <AvatarFallback className="bg-amber-400 text-zinc-900 text-xs font-bold">
                    {profile?.full_name?.[0]?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
                {/* Badge dot: notifs or unread */}
                {(notifCount > 0) && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-400 text-zinc-900 text-[8px] font-bold rounded-full flex items-center justify-center leading-none border-2 border-zinc-950">
                    {notifCount > 9 ? "9+" : notifCount}
                  </span>
                )}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild className="hidden md:flex text-zinc-400 hover:text-white">
                <Link href="/auth/login">Iniciar sesión</Link>
              </Button>
              <Button asChild className="hidden md:flex bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold text-sm">
                <Link href="/auth/register">Registrarse</Link>
              </Button>
              {/* Mobile: menú hamburguesa para no-logueados */}
              <button onClick={() => setSheetOpen(!sheetOpen)} className="md:hidden p-2 text-zinc-400 hover:text-white">
                {sheetOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Save notification banner */}
      {saveNotif && (
        <div className="border-t border-amber-400/20 bg-amber-400/10 px-4 py-2.5 flex items-center gap-3">
          <Bookmark className="w-4 h-4 text-amber-400 shrink-0 fill-current" />
          <p className="flex-1 text-sm text-amber-300">
            <span className="font-semibold">¡Diseño caliente!</span>{" "}
            Alguien guardó{" "}
            <Link href={`/design/${saveNotif.designId}`} className="underline underline-offset-2 hover:text-white" onClick={() => setSaveNotif(null)}>
              {saveNotif.designTitle}
            </Link>
            {saveNotif.count > 1 && <span className="text-zinc-400"> · {saveNotif.count} guardados</span>}
          </p>
          <button onClick={() => setSaveNotif(null)} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── MOBILE DROPDOWN MENU (amber, cae desde el navbar) ── */}
      {/* Blur overlay rendered via portal to avoid header stacking context */}
      {mounted && sheetOpen && createPortal(
        <div className="fixed inset-0 top-16 z-[45] bg-zinc-950/60 backdrop-blur-sm pointer-events-none md:hidden" />,
        document.body
      )}
      {sheetOpen && (
        <div className="md:hidden">
          <div className="absolute top-full left-0 right-0 z-50 bg-amber-400 border-t border-amber-500/30 shadow-xl">

            {/* Profile info — solo si hay sesión */}
            {user && (
              <div className="flex items-center gap-3 px-4 py-3 border-b border-amber-500/30">
                <Avatar className="w-10 h-10 border-2 border-amber-500/40 shrink-0">
                  <AvatarImage src={profile?.avatar_url ?? ""} />
                  <AvatarFallback className="bg-zinc-900 text-amber-400 font-bold text-sm">
                    {profile?.full_name?.[0]?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-zinc-900 text-sm truncate">{profile?.full_name ?? "Usuario"}</p>
                    {profile?.plan === "studio" && <CheckCircle className="w-3.5 h-3.5 text-blue-700 shrink-0" />}
                    {(profile?.plan === "pro" || profile?.plan === "premium") && <CheckCircle className="w-3.5 h-3.5 text-zinc-900 shrink-0" />}
                  </div>
                  <p className="text-zinc-700 text-xs truncate">@{profile?.username ?? ""}</p>
                </div>
              </div>
            )}

            {/* Nav links principales */}
            <div className="py-1">
              {navLinks.map(({ href, icon: Icon, label }) => (
                <SheetLink key={href} href={href} icon={Icon} label={label} onClose={() => setSheetOpen(false)}
                  badge={href === "/messages" && unreadCount > 0 ? unreadCount : undefined}
                />
              ))}
            </div>

            {/* Separador + acciones de cuenta */}
            {user && (
              <div className="border-t border-amber-500/30 py-1">
                <SheetLink href={profile?.role === "tattoo_artist" ? `/artist/${profile?.username ?? ""}` : "/profile"} icon={User} label="Mi perfil" onClose={() => setSheetOpen(false)} />
                {profile?.role === "tattoo_artist" && (
                  <SheetLink href="/profile" icon={Bookmark} label="Guardados" onClose={() => setSheetOpen(false)} />
                )}
                {profile?.role === "tattoo_artist" && (
                  <SheetLink href="/plans" icon={Zap} label="Planes" onClose={() => setSheetOpen(false)} />
                )}
                {profile?.role === "administradorgeneral" && (
                  <SheetLink href="/admin" icon={ShieldCheck} label="Panel Admin" onClose={() => setSheetOpen(false)} />
                )}
              </div>
            )}

            {/* Login para no logueados */}
            {!user && (
              <div className="border-t border-amber-500/30 py-1">
                <SheetLink href="/auth/login" icon={User} label="Iniciar sesión" onClose={() => setSheetOpen(false)} />
                <SheetLink href="/auth/register" icon={Zap} label="Registrarse gratis" onClose={() => setSheetOpen(false)} />
              </div>
            )}


            {/* Notificaciones (clientes) */}
            {isClient && (
              <div className="border-t border-amber-500/30">
                <button
                  onClick={() => setNotifsExpanded((v) => !v)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-medium text-zinc-900 hover:bg-amber-300/50 transition-colors"
                >
                  <Bell className="w-5 h-5 text-zinc-700 shrink-0" />
                  <span className="flex-1 text-left">Notificaciones</span>
                  {notifCount > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 bg-zinc-900 text-amber-400 text-xs font-bold rounded-full flex items-center justify-center">
                      {notifCount > 9 ? "9+" : notifCount}
                    </span>
                  )}
                  {notifsExpanded ? <ChevronDown className="w-4 h-4 text-zinc-700" /> : <ChevronRight className="w-4 h-4 text-zinc-700" />}
                </button>
                {notifsExpanded && (
                  <div className="bg-zinc-900 mx-3 mb-2 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    <NotifList notifs={notifs} onClose={() => setSheetOpen(false)} />
                  </div>
                )}
              </div>
            )}

            {/* Instalar app */}
            {!isStandalone && (
              <div className="border-t border-amber-500/30">
                {installPrompt ? (
                  <button
                    onClick={async () => {
                      installPrompt.prompt();
                      const { outcome } = await installPrompt.userChoice;
                      if (outcome === "accepted") setInstallPrompt(null);
                      setSheetOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-medium text-zinc-900 hover:bg-amber-300/50 transition-colors"
                  >
                    <Download className="w-5 h-5 text-zinc-700 shrink-0" />
                    Instalar app
                  </button>
                ) : isIOS ? (
                  <>
                    <button
                      onClick={() => setShowIOSGuide((v) => !v)}
                      className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-medium text-zinc-900 hover:bg-amber-300/50 transition-colors"
                    >
                      <Download className="w-5 h-5 text-zinc-700 shrink-0" />
                      <span className="flex-1 text-left">Instalar app</span>
                      {showIOSGuide ? <ChevronDown className="w-4 h-4 text-zinc-700" /> : <ChevronRight className="w-4 h-4 text-zinc-700" />}
                    </button>
                    {showIOSGuide && (
                      <div className="mx-4 mb-3 bg-zinc-900 rounded-xl p-3 space-y-2 text-sm text-zinc-300">
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

            {/* Cerrar sesión */}
            {user && (
              <div className="border-t border-amber-500/30 py-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-700 hover:bg-amber-300/50 transition-colors"
                >
                  <LogOut className="w-5 h-5 shrink-0" />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function SheetLink({ href, icon: Icon, label, onClose, badge }: { href: string; icon: React.ElementType; label: string; onClose: () => void; badge?: number }) {
  const router = useRouter();
  return (
    <button
      onClick={() => { onClose(); router.push(href); }}
      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-zinc-900 hover:bg-amber-300/50 transition-colors"
    >
      <Icon className="w-5 h-5 text-zinc-700 shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {badge && badge > 0 && (
        <span className="min-w-[20px] h-5 px-1.5 bg-zinc-900 text-amber-400 text-xs font-bold rounded-full flex items-center justify-center">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

function notifSubtitle(n: { type?: string; saves_count: number }) {
  if (n.type === "new_design") return "Nuevo diseño disponible";
  if (n.type === "design_reserved") return "Fue reservado";
  return `${n.saves_count} persona${n.saves_count !== 1 ? "s" : ""} lo ${n.saves_count !== 1 ? "tienen" : "tiene"} guardado`;
}

function NotifList({ notifs, onClose }: { notifs: { id: string; design_id: string; design_title: string; design_image: string | null; saves_count: number; type?: string; read: boolean }[]; onClose: () => void }) {
  if (notifs.length === 0) {
    return <div className="px-4 py-8 text-center text-zinc-500 text-sm">Sin notificaciones todavía</div>;
  }
  return (
    <div>
      {notifs.map((n) => (
        <Link
          key={n.id}
          href={`/design/${n.design_id}`}
          onClick={onClose}
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
            <p className="text-xs text-amber-400">{notifSubtitle(n)}</p>
          </div>
          {!n.read && <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />}
        </Link>
      ))}
    </div>
  );
}
