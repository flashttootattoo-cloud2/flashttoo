"use client";

import { useState, useRef } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Plus, Trash2, ToggleLeft, ToggleRight, MapPin, ExternalLink,
  Loader2, Pencil, MousePointerClick, Eye, X,
} from "lucide-react";

interface Ad {
  id: string;
  brand_name: string;
  image_url: string;
  contact_url: string | null;
  city: string | null;
  is_active: boolean;
  clicks_count: number;
  views_count: number;
  created_at: string;
}

export function AdminAdsClient({ ads: initial }: { ads: Ad[] }) {
  const supabase = createClient();
  const [ads, setAds] = useState<Ad[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Create form state
  const [brandName, setBrandName] = useState("");
  const [contactUrl, setContactUrl] = useState("");
  const [city, setCity] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  // Edit state
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [editBrand, setEditBrand] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editCity, setEditCity] = useState("");
  const [saving, setSaving] = useState(false);

  const openEdit = (ad: Ad) => {
    setEditingAd(ad);
    setEditBrand(ad.brand_name);
    setEditContact(ad.contact_url ?? "");
    setEditCity(ad.city ?? "");
  };

  const handleEdit = async () => {
    if (!editingAd || !editBrand.trim()) return;
    setSaving(true);
    const res = await fetch("/api/admin/update-ad", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingAd.id, brand_name: editBrand.trim(), contact_url: editContact.trim(), city: editCity.trim() }),
    });
    const { ad: updated, error } = await res.json();
    if (error || !updated) { toast.error("No se pudo guardar"); setSaving(false); return; }
    setAds((prev) => prev.map((a) => a.id === updated.id ? { ...a, ...updated } : a));
    setEditingAd(null);
    setSaving(false);
    toast.success("Publicidad actualizada");
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleCreate = async () => {
    if (!file || !brandName.trim()) { toast.error("Completá nombre e imagen"); return; }
    setUploading(true);

    const form = new FormData();
    form.append("file", file);
    form.append("meta", JSON.stringify({ brand_name: brandName.trim(), contact_url: contactUrl.trim(), city: city.trim() }));
    const upRes = await fetch("/api/admin/upload-ad-image", { method: "POST", body: form });
    if (!upRes.ok) { toast.error("Error al crear publicidad"); setUploading(false); return; }
    const { ad: newAd, error } = await upRes.json();

    if (error || !newAd) { toast.error("Error al crear publicidad"); setUploading(false); return; }

    setAds((prev) => [{ clicks_count: 0, views_count: 0, ...newAd } as Ad, ...prev]);
    setBrandName(""); setContactUrl(""); setCity(""); setFile(null); setPreview(null);
    setShowForm(false);
    setUploading(false);
    toast.success("Publicidad creada");
  };

  const toggleActive = async (ad: Ad) => {
    const next = !ad.is_active;
    const res = await fetch("/api/admin/toggle-ad", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ad.id, is_active: next }),
    });
    if (!res.ok) { toast.error("Error al actualizar"); return; }
    setAds((prev) => prev.map((a) => a.id === ad.id ? { ...a, is_active: next } : a));
  };

  const [confirmingAd, setConfirmingAd] = useState<Ad | null>(null);

  const handleDelete = async (ad: Ad) => {
    await supabase.from("ads").delete().eq("id", ad.id);
    setAds((prev) => prev.filter((a) => a.id !== ad.id));
    setConfirmingAd(null);
    toast.success("Publicidad eliminada");
  };

  return (
    <div>
      {confirmingAd && (
        <ConfirmDialog
          title={`Eliminar "${confirmingAd.brand_name}"`}
          description="Esta acción no se puede deshacer. La publicidad será eliminada permanentemente."
          onConfirm={() => handleDelete(confirmingAd)}
          onCancel={() => setConfirmingAd(null)}
        />
      )}

      {/* Edit modal */}
      {editingAd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={() => setEditingAd(null)} />
          <div className="relative z-10 w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Editar publicidad</h2>
              <button onClick={() => setEditingAd(null)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Nombre de la marca *</label>
                <Input value={editBrand} onChange={(e) => setEditBrand(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Link de contacto</label>
                <Input value={editContact} onChange={(e) => setEditContact(e.target.value)}
                  placeholder="https://instagram.com/marca"
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Ciudad (vacío = global)</label>
                <Input value={editCity} onChange={(e) => setEditCity(e.target.value)}
                  placeholder="Ej: Buenos Aires"
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={() => setEditingAd(null)} variant="outline"
                  className="flex-1 border-zinc-700 hover:bg-zinc-800" disabled={saving}>Cancelar</Button>
                <Button onClick={handleEdit} disabled={saving || !editBrand.trim()}
                  className="flex-1 bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-zinc-500">{ads.length} publicidades · {ads.filter(a => a.is_active).length} activas</p>
        <Button
          onClick={() => setShowForm((v) => !v)}
          className="bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Nueva publicidad
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mb-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h2 className="font-semibold mb-4 text-sm">Nueva publicidad</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Imagen *</label>
              <div
                onClick={() => fileRef.current?.click()}
                className="w-full h-40 rounded-xl border-2 border-dashed border-zinc-700 hover:border-zinc-500 cursor-pointer flex items-center justify-center overflow-hidden transition-colors"
              >
                {preview
                  ? <img src={preview} alt="" className="w-full h-full object-cover" />
                  : <span className="text-zinc-500 text-sm">Clic para subir imagen</span>
                }
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Nombre de la marca *</label>
                <Input value={brandName} onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Ej: TattoInk Studio"
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Link de contacto</label>
                <Input value={contactUrl} onChange={(e) => setContactUrl(e.target.value)}
                  placeholder="https://instagram.com/marca"
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Ciudad (opcional — vacío = global)</label>
                <Input value={city} onChange={(e) => setCity(e.target.value)}
                  placeholder="Ej: Buenos Aires"
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500" />
              </div>
              <div className="flex gap-2 mt-auto">
                <Button onClick={handleCreate} disabled={uploading}
                  className="flex-1 bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold" size="sm">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear publicidad"}
                </Button>
                <Button onClick={() => setShowForm(false)} variant="outline"
                  className="border-zinc-700 hover:bg-zinc-800" size="sm">Cancelar</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ads grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ads.map((ad) => (
          <div
            key={ad.id}
            className={`bg-zinc-900 border rounded-2xl overflow-hidden ${ad.is_active ? "border-zinc-800" : "border-zinc-800 opacity-50"}`}
          >
            <div className="relative">
              <img src={ad.image_url} alt={ad.brand_name} className="w-full h-40 object-cover" />
              {!ad.is_active && (
                <div className="absolute inset-0 bg-zinc-950/60 flex items-center justify-center">
                  <span className="bg-zinc-900 text-zinc-400 text-xs px-3 py-1 rounded-full border border-zinc-700">Inactiva</span>
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="font-semibold text-sm">{ad.brand_name}</p>
                {ad.city && (
                  <span className="flex items-center gap-1 text-xs text-zinc-500 shrink-0">
                    <MapPin className="w-3 h-3" />{ad.city}
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3 mb-2">
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <Eye className="w-3 h-3" />{ad.views_count ?? 0} vistas
                </span>
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <MousePointerClick className="w-3 h-3" />{ad.clicks_count ?? 0} clicks
                </span>
              </div>

              {ad.contact_url && (
                <a href={ad.contact_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-amber-400 transition-colors mb-3 truncate">
                  <ExternalLink className="w-3 h-3 shrink-0" />
                  {ad.contact_url}
                </a>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(ad)}
                  className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${ad.is_active ? "text-emerald-400 hover:text-emerald-300" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  {ad.is_active
                    ? <><ToggleRight className="w-4 h-4" /> Activa</>
                    : <><ToggleLeft className="w-4 h-4" /> Inactiva</>}
                </button>
                <span className="ml-auto" />
                <button
                  onClick={() => openEdit(ad)}
                  className="text-zinc-600 hover:text-amber-400 transition-colors"
                  title="Editar"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setConfirmingAd(ad)}
                  className="text-zinc-600 hover:text-red-400 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {ads.length === 0 && (
          <div className="col-span-full text-center py-16 text-zinc-500 text-sm">
            No hay publicidades todavía. Crea la primera.
          </div>
        )}
      </div>
    </div>
  );
}
