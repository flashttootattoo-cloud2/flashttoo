"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { ArrowLeft, Camera, Loader2, Save, CheckCircle, XCircle, Brush, User } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [role, setRole] = useState<string>("client");

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [instagram, setInstagram] = useState("");
  const [phone, setPhone] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [originalUsername, setOriginalUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  const checkUsername = useDebouncedCallback(async (value: string, original: string) => {
    const clean = value.toLowerCase().replace(/\s+/g, "_");
    if (clean.length < 3 || clean === original) { setUsernameStatus("idle"); return; }
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
    checkUsername(e.target.value, originalUsername);
  };

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setAvatarUrl(profile.avatar_url ?? null);
        setFullName(profile.full_name ?? "");
        setUsername(profile.username ?? "");
        setOriginalUsername(profile.username ?? "");
        setBio(profile.bio ?? "");
        setCity(profile.city ?? "");
        setCountry(profile.country ?? "");
        setInstagram(profile.instagram ?? "");
        setPhone(profile.phone ?? "");
        setRole(profile.role ?? "client");
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleUpgradeToArtist = async () => {
    if (!userId) return;
    setUpgrading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ role: "tattoo_artist" })
      .eq("id", userId);
    if (error) {
      toast.error("Error al cambiar el rol.");
    } else {
      setRole("tattoo_artist");
      toast.success("¡Ya sos tatuador/a! Redirigiendo a tu perfil...");
      setTimeout(() => router.push(`/artist/${username}`), 1500);
    }
    setUpgrading(false);
  };

  const handleDowngradeToClient = async () => {
    if (!userId) return;
    setUpgrading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ role: "client" })
      .eq("id", userId);
    if (error) {
      toast.error("Error al cambiar el rol.");
    } else {
      setRole("client");
      toast.success("Volviste al modo cliente. Tus diseños guardados y seguidos siguen intactos.");
      setTimeout(() => router.push("/profile"), 1500);
    }
    setUpgrading(false);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Solo se admiten imágenes.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede superar 5MB.");
      return;
    }

    // Show preview immediately
    setAvatarPreview(URL.createObjectURL(file));
    setUploadingAvatar(true);

    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600" });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      // Añadir timestamp para evitar caché
      const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;

      await supabase
        .from("profiles")
        .update({ avatar_url: urlWithTimestamp })
        .eq("id", userId);

      setAvatarUrl(urlWithTimestamp);
      toast.success("Foto de perfil actualizada.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al subir la foto.";
      toast.error(msg);
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userId) return;

    if (!fullName.trim()) {
      toast.error("El nombre es obligatorio.");
      return;
    }
    if (!username.trim()) {
      toast.error("El usuario es obligatorio.");
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

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        username: username.toLowerCase().replace(/\s+/g, "_"),
        bio: bio.trim() || null,
        city: city.trim() || null,
        country: country.trim() || null,
        instagram: instagram.trim() || null,
        phone: phone.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      if (error.code === "23505") {
        toast.error("Ese nombre de usuario ya está en uso.");
      } else {
        toast.error("Error al guardar los cambios.");
      }
    } else {
      toast.success("Perfil actualizado.");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  const currentAvatar = avatarPreview ?? avatarUrl;

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <Link
        href={role === "tattoo_artist" ? "/dashboard" : "/profile"}
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {role === "tattoo_artist" ? "Volver al dashboard" : "Volver al perfil"}
      </Link>

      <h1 className="text-2xl font-bold mb-8">Configuración de perfil</h1>

      {/* Avatar */}
      <div className="flex items-center gap-5 mb-8 p-5 bg-zinc-900 border border-zinc-800 rounded-xl">
        <div className="relative">
          <Avatar className="w-20 h-20 border-2 border-zinc-700">
            <AvatarImage src={currentAvatar ?? ""} />
            <AvatarFallback className="bg-amber-400 text-zinc-900 text-2xl font-bold">
              {fullName?.[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          {uploadingAvatar && (
            <div className="absolute inset-0 bg-zinc-900/70 rounded-full flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            </div>
          )}
        </div>
        <div>
          <p className="font-medium mb-1">Foto de perfil</p>
          <p className="text-zinc-400 text-sm mb-3">JPG, PNG o WEBP · Máx 5MB</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-zinc-700 hover:bg-zinc-800"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
          >
            <Camera className="w-4 h-4 mr-2" />
            {uploadingAvatar ? "Subiendo..." : "Cambiar foto"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">Nombre completo *</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Tu nombre"
              required
              className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-400"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300 flex items-center justify-between">
              Usuario *
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
                value={username}
                onChange={handleUsernameChange}
                placeholder="username"
                required
                className={cn(
                  "bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-400",
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
          <label className="text-sm font-medium text-zinc-300 flex items-center justify-between">
            Bio
            <span className={`text-xs font-normal ${bio.length > 130 ? "text-red-400" : "text-zinc-500"}`}>
              {bio.length}/150
            </span>
          </label>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 150))}
            placeholder="Contá un poco sobre vos y tu trabajo..."
            rows={3}
            className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-400 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">Ciudad</label>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Buenos Aires"
              className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-400"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">País</label>
            <Input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Argentina"
              className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">Instagram</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">@</span>
              <Input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="tuusuario"
                className="pl-7 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-400"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">Teléfono / WhatsApp</label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+54 9 11..."
              className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-400"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={saving}
          className="w-full bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold h-11"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Guardar cambios
            </>
          )}
        </Button>
      </form>

      {/* Upgrade to artist */}
      {role === "client" && (
        <div
          className={cn(
            "mt-8 p-6 rounded-xl border transition-all",
            searchParams.get("upgrade") === "true"
              ? "border-amber-400/50 bg-amber-400/5"
              : "border-zinc-800 bg-zinc-900"
          )}
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-400/10 flex items-center justify-center shrink-0">
              <Brush className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-white mb-1">Convertirte en tatuador/a</h2>
              <p className="text-zinc-400 text-sm mb-4">
                Activá tu perfil de artista, subí tus diseños flash y comenzá a recibir clientes. Es gratis para empezar.
              </p>
              <Button
                onClick={handleUpgradeToArtist}
                disabled={upgrading}
                className="bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold"
              >
                {upgrading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Brush className="w-4 h-4 mr-2" />
                    Cambiar a cuenta tatuador
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Downgrade to client */}
      {role === "tattoo_artist" && (
        <div className="mt-8 p-6 rounded-xl border border-zinc-800 bg-zinc-900">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-zinc-400" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-white mb-1">Volver al modo cliente</h2>
              <p className="text-zinc-400 text-sm mb-1">
                Tu perfil de artista y tus diseños quedan guardados. Podés volver a activarlo cuando quieras.
              </p>
              <p className="text-zinc-500 text-xs mb-4">
                Tus diseños guardados y los tatuadores que seguís no se pierden.
              </p>
              <Button
                onClick={handleDowngradeToClient}
                disabled={upgrading}
                variant="outline"
                className="border-zinc-700 hover:bg-zinc-800 text-zinc-300"
              >
                {upgrading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <User className="w-4 h-4 mr-2" />
                    Cambiar a cuenta cliente
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
