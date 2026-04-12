"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Brush, User, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebouncedCallback } from "use-debounce";
import type { UserRole } from "@/types/database";

export default function RegisterPage() {
  const supabase = createClient();
  const [role, setRole] = useState<UserRole>("client");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // username availability
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  const checkUsername = useDebouncedCallback(async (value: string) => {
    const clean = value.toLowerCase().replace(/\s+/g, "_");
    if (clean.length < 3) { setUsernameStatus("idle"); return; }
    setUsernameStatus("checking");
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", clean)
      .maybeSingle();
    setUsernameStatus(data ? "taken" : "available");
  }, 500);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    setUsernameStatus("idle");
    checkUsername(e.target.value);
  };

  const handleRegister = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (usernameStatus === "taken") {
      toast.error("Ese nombre de usuario ya está en uso.");
      return;
    }
    if (usernameStatus === "checking") {
      toast.error("Esperá que termine de verificar el usuario.");
      return;
    }
    setLoading(true);

    const cleanUsername = username.toLowerCase().replace(/\s+/g, "_");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { full_name: fullName, username: cleanUsername, role, city },
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Si el usuario ya existe confirmado, Supabase devuelve identities vacío
    if (data.user && data.user.identities?.length === 0) {
      toast.error("Ya existe una cuenta con ese email.");
      setLoading(false);
      return;
    }

    setEmailSent(true);
    setLoading(false);
  };

  if (emailSent) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="text-6xl mb-6">📬</div>
          <h1 className="text-2xl font-bold mb-3">Revisá tu email</h1>
          <p className="text-zinc-400 mb-2">
            Te mandamos un link de confirmación a
          </p>
          <p className="text-amber-400 font-semibold mb-6">{email}</p>
          <p className="text-zinc-500 text-sm">
            Hacé clic en el link del mail para activar tu cuenta.
            Puede tardar unos minutos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image
            src="/logo.png"
            alt="Flashttoo"
            width={180}
            height={48}
            className="h-12 w-auto mx-auto mb-6"
            priority
          />
          <p className="text-zinc-400 text-sm uppercase tracking-widest font-medium">
            Creá tu cuenta · Es gratis
          </p>
        </div>

        <form
          onSubmit={handleRegister}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-5"
        >
          {/* Role selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Soy...</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("client")}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                  role === "client"
                    ? "border-amber-400 bg-amber-400/10 text-amber-400"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                )}
              >
                <User className="w-6 h-6" />
                <span className="text-sm font-medium">Cliente</span>
                <span className="text-xs opacity-70">Busco tatuadores</span>
              </button>
              <button
                type="button"
                onClick={() => setRole("tattoo_artist")}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                  role === "tattoo_artist"
                    ? "border-amber-400 bg-amber-400/10 text-amber-400"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                )}
              >
                <Brush className="w-6 h-6" />
                <span className="text-sm font-medium">Tatuador/a</span>
                <span className="text-xs opacity-70">Muestro mi trabajo</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">Nombre completo</label>
              <Input
                placeholder="Tu nombre"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300 flex items-center justify-between">
                Usuario
                {usernameStatus === "available" && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1 font-normal">
                    <CheckCircle className="w-3 h-3" /> disponible
                  </span>
                )}
                {usernameStatus === "taken" && (
                  <span className="text-xs text-red-400 flex items-center gap-1 font-normal">
                    <XCircle className="w-3 h-3" /> ya está en uso
                  </span>
                )}
                {usernameStatus === "checking" && (
                  <span className="text-xs text-zinc-500 font-normal">verificando...</span>
                )}
              </label>
              <div className="relative">
                <Input
                  placeholder="@username"
                  value={username}
                  onChange={handleUsernameChange}
                  required
                  className={cn(
                    "bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-400",
                    usernameStatus === "available" && "border-emerald-500 focus:border-emerald-400",
                    usernameStatus === "taken" && "border-red-500 focus:border-red-400"
                  )}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameStatus === "available" && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                  {usernameStatus === "taken" && <XCircle className="w-4 h-4 text-red-400" />}
                  {usernameStatus === "checking" && <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">Ciudad</label>
            <Input
              placeholder="Buenos Aires, Córdoba..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">Email</label>
            <Input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">Contraseña</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-400 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold h-11"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear cuenta gratis"}
          </Button>

          <p className="text-center text-xs text-zinc-500">
            Al registrarte aceptás nuestros{" "}
            <Link href="/legal/terminos" className="underline hover:text-zinc-300 transition-colors">
              términos de uso
            </Link>{" "}
            y{" "}
            <Link href="/legal/privacidad" className="underline hover:text-zinc-300 transition-colors">
              política de privacidad
            </Link>.
          </p>

          <p className="text-center text-sm text-zinc-400">
            ¿Ya tenés cuenta?{" "}
            <Link href="/auth/login" className="text-amber-400 hover:underline">
              Iniciá sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
