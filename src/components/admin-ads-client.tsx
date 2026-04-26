"use client";

import { useState, useRef } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Plus, Trash2, ToggleLeft, ToggleRight, MapPin, ExternalLink,
  Loader2, Pencil, MousePointerClick, Eye, X, ChevronDown, ChevronRight, Search, Globe, Clock,
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
  expires_at: string | null;
}

export function AdminAdsClient({ ads: initial }: { ads: Ad[] }) {
  const [ads, setAds] = useState<Ad[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Create form state
  const [brandName, setBrandName] = useState("");
  const [contactUrl, setContactUrl] = useState("");
  const [city, setCity] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  // Edit state
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [editBrand, setEditBrand] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editDays, setEditDays] = useState("");
  const [saving, setSaving] = useState(false);

  const openEdit = (ad: Ad) => {
    setEditingAd(ad);
    setEditBrand(ad.brand_name);
    setEditContact(ad.contact_url ?? "");
    setEditCity(ad.city ?? "");
    setEditDays("");
  };

  const handleEdit = async () => {
    if (!editingAd || !editBrand.trim()) return;
    setSaving(true);
    const res = await fetch("/api/admin/update-ad", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingAd.id,
        brand_name: editBrand.trim(),
        contact_url: editContact.trim(),
        city: editCity.trim(),
        duration_days: editDays ? parseInt(editDays) : null,
      }),
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
    form.append("meta", JSON.stringify({
      brand_name: brandName.trim(),
      contact_url: contactUrl.trim(),
      city: city.trim(),
      duration_days: durationDays ? parseInt(durationDays) : null,
    }));
    const upRes = await fetch("/api/admin/upload-ad-image", { method: "POST", body: form });
    if (!upRes.ok) { toast.error("Error al crear publicidad"); setUploading(false); return; }
    const { ad: newAd, error } = await upRes.json();

    if (error || !newAd) { toast.error("Error al crear publicidad"); setUploading(false); return; }

    setAds((prev) => [{ clicks_count: 0, views_count: 0, ...newAd } as Ad, ...prev]);
    setBrandName(""); setContactUrl(""); setCity(""); setDurationDays(""); setFile(null); setPreview(null);
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
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [brandSearch, setBrandSearch] = useState("");
  const [openBrands, setOpenBrands] = useState<Record<string, boolean>>({});
  const toggleBrand = (key: string) => setOpenBrands((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleDelete = async (ad: Ad) => {
    const res = await fetch("/api/admin/delete-ad", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ad.id }),
    });
    if (!res.ok) { toast.error("No se pudo eliminar"); return; }
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
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Extender días activa (se suma al vencimiento actual)</label>
                <Input value={editDays} onChange={(e) => setEditDays(e.target.value)}
                  type="number" min="1" placeholder="Ej: 15"
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

      {showExpiryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={() => setShowExpiryModal(false)} />
          <div className="relative z-10 w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <h2 className="font-semibold text-sm">Por vencer</h2>
              </div>
              <button onClick={() => setShowExpiryModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto divide-y divide-zinc-800">
              {(() => {
                const now = new Date();
                const withExpiry = ads
                  .filter((a) => a.is_active && a.expires_at)
                  .map((a) => ({
                    ...a,
                    daysLeft: Math.ceil((new Date(a.expires_at!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
                  }))
                  .sort((a, b) => a.daysLeft - b.daysLeft);

                if (withExpiry.length === 0) return (
                  <p className="text-zinc-500 text-sm text-center py-10">No hay publicidades activas con vencimiento.</p>
                );

                return withExpiry.map((ad) => {
                  const urgent = ad.daysLeft <= 7;
                  const warning = ad.daysLeft > 7 && ad.daysLeft <= 30;
                  const color = urgent ? "text-red-400" : warning ? "text-amber-400" : "text-emerald-400";
                  const bg = urgent ? "bg-red-500/10" : warning ? "bg-amber-400/10" : "bg-emerald-500/10";
                  return (
                    <div key={ad.id} className="flex items-center gap-3 px-5 py-3.5">
                      <img src={ad.image_url} alt={ad.brand_name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{ad.brand_name}</p>
                        <p className="text-xs text-zinc-500">{ad.city ?? "Global"}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${color} ${bg}`}>
                        {ad.daysLeft <= 0 ? "Vencida" : `${ad.daysLeft}d`}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-zinc-500">{ads.length} publicidades · {ads.filter(a => a.is_active).length} activas</p>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowExpiryModal(true)}
            variant="outline"
            className="border-zinc-700 hover:bg-zinc-800 text-zinc-300"
            size="sm"
          >
            <Clock className="w-4 h-4 mr-1.5" />
            Por vencer
          </Button>
          <Button
            onClick={() => setShowForm((v) => !v)}
            className="bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nueva publicidad
          </Button>
        </div>
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
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Días activa (vacío = sin vencimiento)</label>
                <Input value={durationDays} onChange={(e) => setDurationDays(e.target.value)}
                  type="number" min="1" placeholder="Ej: 30"
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

      {/* Search */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            value={citySearch}
            onChange={(e) => setCitySearch(e.target.value)}
            placeholder="Buscar por ciudad..."
            className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
          />
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            value={brandSearch}
            onChange={(e) => setBrandSearch(e.target.value)}
            placeholder="Buscar por marca..."
            className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
          />
        </div>
      </div>

      {/* Grouped by city → brand */}
      {(() => {
        const filtered = ads.filter((a) =>
          (!citySearch.trim() || (a.city ?? "Global").toLowerCase().includes(citySearch.toLowerCase())) &&
          (!brandSearch.trim() || a.brand_name.toLowerCase().includes(brandSearch.toLowerCase()))
        );

        // Group by city
        const byCity: Record<string, Ad[]> = {};
        for (const ad of filtered) {
          const key = ad.city?.trim() || "Global";
          if (!byCity[key]) byCity[key] = [];
          byCity[key].push(ad);
        }

        const cities = Object.keys(byCity).sort((a, b) =>
          a === "Global" ? -1 : b === "Global" ? 1 : a.localeCompare(b)
        );

        if (cities.length === 0) {
          return (
            <div className="text-center py-16 text-zinc-500 text-sm">
              {ads.length === 0 ? "No hay publicidades todavía. Crea la primera." : "No se encontraron resultados."}
            </div>
          );
        }

        return cities.map((city) => {
          // Group by brand within city
          const byBrand: Record<string, Ad[]> = {};
          for (const ad of byCity[city]) {
            if (!byBrand[ad.brand_name]) byBrand[ad.brand_name] = [];
            byBrand[ad.brand_name].push(ad);
          }

          return (
            <div key={city} className="mb-8">
              {/* City header */}
              <div className="flex items-center gap-2 mb-3">
                {city === "Global"
                  ? <Globe className="w-4 h-4 text-zinc-400" />
                  : <MapPin className="w-4 h-4 text-amber-400" />}
                <h2 className="font-semibold text-sm text-white">{city}</h2>
                <span className="text-xs text-zinc-600">{byCity[city].length} publicidad{byCity[city].length !== 1 ? "es" : ""}</span>
              </div>

              {/* Brand folders */}
              <div className="space-y-3">
                {Object.entries(byBrand).map(([brand, brandAds]) => {
                  const folderKey = `${city}::${brand}`;
                  const isOpen = openBrands[folderKey] ?? true;
                  return (
                    <div key={brand} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                      {/* Brand header */}
                      <button
                        onClick={() => toggleBrand(folderKey)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors"
                      >
                        {isOpen
                          ? <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
                          : <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />}
                        <span className="font-medium text-sm text-white flex-1 text-left">{brand}</span>
                        <span className="text-xs text-zinc-500">{brandAds.length} aviso{brandAds.length !== 1 ? "s" : ""}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ml-2 ${
                          brandAds.some((a) => a.is_active)
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-zinc-800 text-zinc-500"
                        }`}>
                          {brandAds.filter((a) => a.is_active).length} activo{brandAds.filter((a) => a.is_active).length !== 1 ? "s" : ""}
                        </span>
                      </button>

                      {/* Ads inside brand */}
                      {isOpen && (
                        <div className="border-t border-zinc-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                          {brandAds.map((ad) => (
                            <div key={ad.id} className={`border rounded-xl overflow-hidden ${ad.is_active ? "border-zinc-700" : "border-zinc-800 opacity-50"}`}>
                              <div className="relative">
                                <img src={ad.image_url} alt={ad.brand_name} className="w-full h-36 object-cover" />
                                {!ad.is_active && (
                                  <div className="absolute inset-0 bg-zinc-950/60 flex items-center justify-center">
                                    <span className="bg-zinc-900 text-zinc-400 text-xs px-3 py-1 rounded-full border border-zinc-700">Inactiva</span>
                                  </div>
                                )}
                              </div>
                              <div className="p-3">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="flex items-center gap-1 text-xs text-zinc-500">
                                    <Eye className="w-3 h-3" />{ad.views_count ?? 0}
                                  </span>
                                  <span className="flex items-center gap-1 text-xs text-zinc-500">
                                    <MousePointerClick className="w-3 h-3" />{ad.clicks_count ?? 0}
                                  </span>
                                </div>
                                {ad.expires_at && (
                                  <p className="text-xs text-zinc-500 mb-1">
                                    Vence: {new Date(ad.expires_at).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                                    {new Date(ad.expires_at) < new Date() && <span className="text-red-400 ml-1">· Expirada</span>}
                                  </p>
                                )}
                                {ad.contact_url && (
                                  <a href={ad.contact_url} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-amber-400 transition-colors mb-2 truncate">
                                    <ExternalLink className="w-3 h-3 shrink-0" />{ad.contact_url}
                                  </a>
                                )}
                                <div className="flex items-center gap-2">
                                  <button onClick={() => toggleActive(ad)}
                                    className={`flex items-center gap-1 text-xs font-medium transition-colors ${ad.is_active ? "text-emerald-400 hover:text-emerald-300" : "text-zinc-500 hover:text-zinc-300"}`}>
                                    {ad.is_active ? <><ToggleRight className="w-4 h-4" /> Activa</> : <><ToggleLeft className="w-4 h-4" /> Inactiva</>}
                                  </button>
                                  <span className="ml-auto" />
                                  <button onClick={() => openEdit(ad)} className="text-zinc-600 hover:text-amber-400 transition-colors" title="Editar">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => setConfirmingAd(ad)} className="text-zinc-600 hover:text-red-400 transition-colors" title="Eliminar">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        });
      })()}
    </div>
  );
}
