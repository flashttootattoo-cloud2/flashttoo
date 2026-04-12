"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, ArrowLeft, UserCircle } from "lucide-react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STYLES = [
  "Black & Grey", "Neo Traditional", "Japonés", "Blackwork",
  "Fineline", "Watercolor", "Tribal", "Geométrico", "Old School",
  "Realismo", "Lettering", "Sketch", "Otro",
];

const BODY_PARTS = [
  "Brazo", "Antebrazo", "Mano", "Hombro", "Espalda", "Pecho",
  "Costillas", "Pierna", "Muslo", "Tobillo", "Pie", "Cuello", "Otro",
];

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

export default function EditDesignPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();
  const { user, profile } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [imageUrl, setImageUrl] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [widthCm, setWidthCm] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [style, setStyle] = useState("");
  const [bodyPart, setBodyPart] = useState("");
  const [artistTag, setArtistTag] = useState("");

  const isStudio = profile?.plan === "studio";

  useEffect(() => {
    if (!user) return;
    supabase
      .from("designs")
      .select("*")
      .eq("id", id)
      .eq("artist_id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          toast.error("Diseño no encontrado o no tenés permiso para editarlo.");
          router.push("/dashboard");
          return;
        }
        setTitle(data.title ?? "");
        setDescription(data.description ?? "");
        setPrice(data.price != null ? String(data.price) : "");
        setCurrency(data.currency ?? "USD");
        setWidthCm(data.width_cm != null ? String(data.width_cm) : "");
        setHeightCm(data.height_cm != null ? String(data.height_cm) : "");
        setStyle(data.style ?? "");
        setBodyPart(data.body_part ?? "");
        setArtistTag((data as any).artist_tag ?? "");
        setImageUrl(data.image_url ?? "");
        setFetching(false);
      });
  }, [user, id]);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim()) { toast.error("El título es obligatorio."); return; }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("designs")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          price: price ? parseFloat(price) : null,
          currency: currency || "USD",
          width_cm: widthCm ? parseFloat(widthCm) : null,
          height_cm: heightCm ? parseFloat(heightCm) : null,
          style: style || null,
          body_part: bodyPart || null,
          artist_tag: isStudio && artistTag.trim() ? artistTag.trim() : null,
        })
        .eq("id", id)
        .eq("artist_id", user.id);

      if (error) throw error;
      toast.success("Diseño actualizado.");
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar. Intentá de nuevo.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al dashboard
      </Link>

      <h1 className="text-2xl font-bold mb-6">Editar diseño</h1>

      {imageUrl && (
        <div className="mb-6">
          <img
            src={imageUrl}
            alt={title}
            className="w-full max-h-64 object-contain rounded-xl bg-zinc-900 border border-zinc-800"
          />
          <p className="text-xs text-zinc-500 mt-2 text-center">
            Para cambiar la imagen tenés que subir un diseño nuevo.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-300">Título *</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Rosa japonesa black & grey"
            required
            className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-400"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-300">Descripción</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describí el diseño, técnica, detalles importantes..."
            rows={3}
            className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-400 resize-none"
          />
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
                {STYLES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
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
                {BODY_PARTS.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Dimensions */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">Ancho (cm)</label>
            <Input
              type="number"
              min="0"
              step="0.5"
              value={widthCm}
              onChange={(e) => setWidthCm(e.target.value)}
              placeholder="Ej: 10"
              className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-400"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">Alto (cm)</label>
            <Input
              type="number"
              min="0"
              step="0.5"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              placeholder="Ej: 15"
              className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-400"
            />
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
              <Input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                className="pl-7 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-400"
              />
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
              placeholder="Ej: Lucas Rodríguez"
              className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-blue-400"
            />
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold h-12 text-base disabled:opacity-50"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" />Guardando...</>
          ) : (
            "Guardar cambios"
          )}
        </Button>
      </form>
    </div>
  );
}
