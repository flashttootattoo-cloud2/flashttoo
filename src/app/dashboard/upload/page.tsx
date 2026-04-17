"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Upload, ImageIcon, ArrowLeft, X, Plus, Crown, UserCircle } from "lucide-react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STYLES = [
  "Black & Grey", "Neo Traditional", "Japonés", "Blackwork",
  "Fineline", "Watercolor", "Tribal", "Geométrico", "Old School",
  "Realismo", "Lettering", "Sketch", "Otro",
];

const BODY_PARTS = [
  "Brazo", "Antebrazo", "Mano", "Hombro", "Espalda", "Pecho",
  "Costillas", "Pierna", "Muslo", "Tobillo", "Pie", "Cuello", "Otro",
];

const PLAN_LIMITS: Record<string, number> = { free: 5, basic: 15, pro: 30, premium: 30, studio: 80 };
const MAX_EXTRA_IMAGES = 5;

const CURRENCIES = [
  { code: "USD", symbol: "$",  name: "Dólar (USD)" },
  { code: "EUR", symbol: "€",  name: "Euro (EUR)" },
  { code: "ARS", symbol: "$",  name: "Peso argentino (ARS)" },
  { code: "CLP", symbol: "$",  name: "Peso chileno (CLP)" },
  { code: "COP", symbol: "$",  name: "Peso colombiano (COP)" },
  { code: "MXN", symbol: "$",  name: "Peso mexicano (MXN)" },
  { code: "BRL", symbol: "R$", name: "Real brasileño (BRL)" },
  { code: "UYU", symbol: "$",  name: "Peso uruguayo (UYU)" },
  { code: "PEN", symbol: "S/", name: "Sol peruano (PEN)" },
  { code: "GBP", symbol: "£",  name: "Libra esterlina (GBP)" },
  { code: "AUD", symbol: "A$", name: "Dólar australiano (AUD)" },
  { code: "CAD", symbol: "C$", name: "Dólar canadiense (CAD)" },
  { code: "JPY", symbol: "¥",  name: "Yen japonés (JPY)" },
];

// Detect currency from city/country free text
function currencyFromCity(city: string): string {
  const c = city.toLowerCase();
  if (/argentin|buenos aires|córdoba|cordoba|rosario|mendoza|mar del plata/.test(c)) return "ARS";
  if (/chile|santiago|valparaís|valparaiso|concepción/.test(c)) return "CLP";
  if (/colombia|bogotá|bogota|medellín|medellin|cali/.test(c)) return "COP";
  if (/mexico|méxico|guadalajara|monterrey|ciudad de mexico/.test(c)) return "MXN";
  if (/brasil|brazil|são paulo|sao paulo|rio de janeiro|brasília/.test(c)) return "BRL";
  if (/uruguay|montevideo/.test(c)) return "UYU";
  if (/peru|perú|lima/.test(c)) return "PEN";
  if (/españa|spain|madrid|barcelona|sevilla|valencia/.test(c)) return "EUR";
  if (/italia|italy|roma|milan|napol/.test(c)) return "EUR";
  if (/franc|paris|lyon|marseille/.test(c)) return "EUR";
  if (/alemania|germany|berlin|munich|hamburg/.test(c)) return "EUR";
  if (/uk|united kingdom|london|manchester|edinburgh/.test(c)) return "GBP";
  if (/australia|sydney|melbourne|brisbane/.test(c)) return "AUD";
  if (/canada|toronto|vancouver|montreal/.test(c)) return "CAD";
  if (/japan|japon|tokyo|osaka/.test(c)) return "JPY";
  return "USD"; // default
}

export default function UploadDesignPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user, profile } = useAuthStore();
  const extraInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [extraFiles, setExtraFiles] = useState<{ file: File; preview: string }[]>([]);
  const [designCount, setDesignCount] = useState<number | null>(null);

  const plan = profile?.plan ?? "free";
  const isPremium = plan === "pro" || plan === "premium" || plan === "studio";
  const isStudio  = plan === "studio";
  const limit = PLAN_LIMITS[plan] ?? 5;
  const atLimit = designCount !== null && designCount >= limit;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [widthCm, setWidthCm] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [style, setStyle] = useState("");
  const [bodyPart, setBodyPart] = useState("");
  const [artistTag, setArtistTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  // Auto-set currency from profile city once profile loads
  useEffect(() => {
    if (profile?.city) setCurrency(currencyFromCity(profile.city));
  }, [profile?.city]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("designs")
      .select("id", { count: "exact", head: true })
      .eq("artist_id", user.id)
      .then(({ count }) => setDesignCount(count ?? 0));
  }, [user]);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith("image/")) { toast.error("Solo se admiten imágenes."); return; }
    if (selected.size > 10 * 1024 * 1024) { toast.error("La imagen no puede superar 10MB."); return; }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const handleExtraFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    const remaining = MAX_EXTRA_IMAGES - extraFiles.length;
    const toAdd = selected.slice(0, remaining);

    const invalid = toAdd.find((f) => !f.type.startsWith("image/") || f.size > 10 * 1024 * 1024);
    if (invalid) { toast.error("Todas las imágenes deben ser JPG/PNG/WEBP y pesar menos de 10MB."); return; }

    setExtraFiles((prev) => [
      ...prev,
      ...toAdd.map((f) => ({ file: f, preview: URL.createObjectURL(f) })),
    ]);
    e.target.value = "";
  };

  const removeExtra = (index: number) => {
    setExtraFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const compressImage = (f: File, maxPx = 1200, quality = 0.85, watermark?: string): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = new window.Image();
      const url = URL.createObjectURL(f);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        if (watermark) {
          const fontSize = Math.max(13, Math.round(w * 0.026));
          const pad = Math.round(fontSize * 0.65);
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.shadowColor = "rgba(0,0,0,0.65)";
          ctx.shadowBlur = 5;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;
          ctx.fillStyle = "rgba(255,255,255,0.72)";
          ctx.fillText(watermark, pad, pad + fontSize);
        }
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Compresión fallida")), "image/jpeg", quality);
      };
      img.onerror = reject;
      img.src = url;
    });

  const uploadImage = async (f: File, path: string, watermark?: string) => {
    const compressed = await compressImage(f, 1200, 0.85, watermark);
    const jpegPath = path.replace(/\.[^.]+$/, ".jpg");
    const { error } = await supabase.storage.from("designs").upload(jpegPath, compressed, {
      cacheControl: "3600",
      upsert: false,
      contentType: "image/jpeg",
    });
    if (error) throw error;
    return supabase.storage.from("designs").getPublicUrl(jpegPath).data.publicUrl;
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file || !user) return;
    if (atLimit) {
      toast.error(`Tu plan ${plan} permite hasta ${limit} diseños activos. Borrá uno o mejorá tu plan.`);
      return;
    }
    if (!title.trim()) { toast.error("El título es obligatorio."); return; }

    setLoading(true);
    try {
      const timestamp = Date.now();
      const ext = file.name.split(".").pop();

      // 1. Upload cover image
      setUploadProgress("Subiendo imagen principal...");
      const wm = `@${profile?.username ?? user.id}`;
      const coverUrl = await uploadImage(file, `${user.id}/${timestamp}.${ext}`, wm);

      // 2. Create design and get ID back
      setUploadProgress("Guardando diseño...");
      const { data: inserted, error: insertError } = await supabase
        .from("designs")
        .insert({
          artist_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          image_url: coverUrl,
          price: price ? parseFloat(price) : null,
          currency: currency || "USD",
          width_cm: widthCm ? parseFloat(widthCm) : null,
          height_cm: heightCm ? parseFloat(heightCm) : null,
          style: style || null,
          body_part: bodyPart || null,
          artist_tag: isStudio && artistTag.trim() ? artistTag.trim() : null,
          is_flash: true,
          is_available: true,
          views_count: 0,
          likes_count: 0,
        })
        .select("id")
        .single();

      if (insertError || !inserted) throw insertError ?? new Error("No se obtuvo el ID del diseño.");

      // 3. Upload extra images (premium only)
      if (isPremium && extraFiles.length > 0) {
        setUploadProgress(`Subiendo fotos adicionales (0/${extraFiles.length})...`);
        const imageInserts = [];

        for (let i = 0; i < extraFiles.length; i++) {
          const ef = extraFiles[i];
          const extExtra = ef.file.name.split(".").pop();
          const url = await uploadImage(ef.file, `${user.id}/${timestamp}_extra${i}.${extExtra}`, wm);
          imageInserts.push({ design_id: inserted.id, image_url: url, sort_order: i });
          setUploadProgress(`Subiendo fotos adicionales (${i + 1}/${extraFiles.length})...`);
        }

        const { error: imagesError } = await supabase.from("design_images").insert(imageInserts);
        if (imagesError) throw imagesError;
      }

      await supabase
        .from("profiles")
        .update({ designs_count: (profile?.designs_count ?? 0) + 1 })
        .eq("id", user.id);

      // Notify followers — keepalive ensures the request survives page navigation
      fetch("/api/follow/notify", {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId: user.id,
          artistName: profile?.full_name ?? profile?.username ?? "Tatuador",
          type: "new_design",
          designId: inserted.id,
          designTitle: title.trim(),
          designImage: coverUrl,
          artistUsername: profile?.username,
        }),
      }).catch(() => {});

      toast.success("¡Diseño publicado con éxito!");
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : JSON.stringify(err);
      console.error("Upload error:", msg, err);
      toast.error(msg || "Error al subir el diseño. Intentá de nuevo.");
    } finally {
      setLoading(false);
      setUploadProgress("");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Volver al dashboard
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Subir nuevo diseño</h1>
        {designCount !== null && (
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${
            atLimit ? "bg-red-500/10 text-red-400 border border-red-500/20"
            : designCount >= limit - 1 ? "bg-amber-400/10 text-amber-400 border border-amber-400/20"
            : "bg-zinc-800 text-zinc-400"
          }`}>
            {designCount}/{limit} slots
          </span>
        )}
      </div>

      {atLimit && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <span className="text-red-400 text-lg shrink-0">⚠️</span>
          <div>
            <p className="text-red-400 font-medium text-sm">Límite de diseños alcanzado</p>
            <p className="text-zinc-400 text-sm mt-0.5">
              Tu plan <span className="capitalize font-medium text-white">{plan}</span> permite hasta <strong>{limit} diseños</strong> activos.
              Borrá uno existente o{" "}
              <Link href="/plans" className="text-amber-400 hover:underline">mejorá tu plan</Link>.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Cover image */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Imagen principal *
            <span className="text-zinc-500 font-normal ml-1.5">— aparece en el feed</span>
          </label>
          {preview ? (
            <div className="relative">
              <img src={preview} alt="Preview" className="w-full max-h-80 object-contain rounded-xl bg-zinc-900 border border-zinc-800" />
              <button type="button" onClick={() => { setFile(null); setPreview(null); }}
                className="absolute top-2 right-2 p-1.5 bg-zinc-900/80 rounded-full text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-zinc-700 rounded-xl cursor-pointer hover:border-amber-400/50 hover:bg-amber-400/5 transition-all">
              <ImageIcon className="w-10 h-10 text-zinc-600 mb-3" />
              <p className="text-zinc-400 text-sm">Hacé clic para seleccionar una imagen</p>
              <p className="text-zinc-600 text-xs mt-1">PNG, JPG, WEBP · Max 10MB</p>
              <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
            </label>
          )}
        </div>

        {/* Extra images — premium only */}
        {isPremium && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-zinc-300 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                Fotos adicionales
                <span className="text-zinc-500 font-normal">— detalles, otros planos</span>
              </label>
              <span className="text-xs text-zinc-500">{extraFiles.length}/{MAX_EXTRA_IMAGES}</span>
            </div>

            <div className="flex gap-2 flex-wrap">
              {extraFiles.map((ef, i) => (
                <div key={i} className="relative w-20 h-20">
                  <img src={ef.preview} alt="" className="w-full h-full object-cover rounded-lg border border-zinc-700" />
                  <button
                    type="button"
                    onClick={() => removeExtra(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-zinc-900 border border-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {extraFiles.length < MAX_EXTRA_IMAGES && (
                <button
                  type="button"
                  onClick={() => extraInputRef.current?.click()}
                  className="w-20 h-20 border-2 border-dashed border-zinc-700 rounded-lg flex flex-col items-center justify-center text-zinc-500 hover:border-amber-400/50 hover:text-zinc-300 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span className="text-xs mt-1">Agregar</span>
                </button>
              )}
            </div>
            <input
              ref={extraInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleExtraFiles}
              className="hidden"
            />
          </div>
        )}

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-300">Título *</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Rosa japonesa black & grey" required
            className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-400" />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-300">Descripción</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Describí el diseño, técnica, detalles importantes..." rows={3}
            className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-400 resize-none" />
        </div>

        {/* Style & body part */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">Estilo</label>
            <Select value={style} onValueChange={(v) => setStyle(v ?? "")}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white focus:border-amber-400">
                <SelectValue placeholder="Seleccionar estilo" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                {STYLES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">Zona del cuerpo</label>
            <Select value={bodyPart} onValueChange={(v) => setBodyPart(v ?? "")}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white focus:border-amber-400">
                <SelectValue placeholder="Seleccionar zona" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                {BODY_PARTS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Dimensions */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">Ancho (cm)</label>
            <Input type="number" min="0" step="0.5" value={widthCm} onChange={(e) => setWidthCm(e.target.value)}
              placeholder="Ej: 10" className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-400" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">Alto (cm)</label>
            <Input type="number" min="0" step="0.5" value={heightCm} onChange={(e) => setHeightCm(e.target.value)}
              placeholder="Ej: 15" className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-400" />
          </div>
        </div>

        {/* Price + Currency */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-300">Precio</label>
          <div className="flex gap-2">
            <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
              <SelectTrigger className="w-44 shrink-0 bg-zinc-900 border-zinc-700 text-white focus:border-amber-400">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-medium">
                {CURRENCIES.find((c) => c.code === currency)?.symbol ?? "$"}
              </span>
              <Input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)}
                placeholder="0" className="pl-7 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-400" />
            </div>
          </div>
        </div>

        {/* Artist tag — studio only */}
        {isStudio && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300 flex items-center gap-1.5">
              <UserCircle className="w-3.5 h-3.5 text-blue-400" />
              Tatuador que lo realiza
              <span className="text-zinc-500 font-normal">— opcional</span>
            </label>
            <Input
              value={artistTag}
              onChange={(e) => setArtistTag(e.target.value)}
              placeholder="Ej: Federico González"
              className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-blue-400"
            />
            <p className="text-xs text-zinc-500">Se mostrará en el diseño para que el cliente sepa con quién reserva.</p>
          </div>
        )}

        <Button type="submit" disabled={!file || loading || atLimit}
          className="w-full bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold h-12 text-base disabled:opacity-50">
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" />{uploadProgress || "Subiendo..."}</>
          ) : (
            <><Upload className="w-4 h-4 mr-2" />Publicar diseño</>
          )}
        </Button>
      </form>
    </div>
  );
}
