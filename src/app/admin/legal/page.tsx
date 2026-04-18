"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Save, Bell } from "lucide-react";

const PAGES = [
  { key: "terminos", label: "Términos de uso" },
  { key: "privacidad", label: "Política de privacidad" },
];

export default function AdminLegalPage() {
  const supabase = createClient();
  const [activeKey, setActiveKey] = useState("terminos");
  const [contents, setContents] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notifying, setNotifying] = useState(false);

  useEffect(() => {
    supabase
      .from("site_content")
      .select("key, value")
      .in("key", ["terminos", "privacidad"])
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data ?? []).forEach((row: { key: string; value: string }) => { map[row.key] = row.value; });
        setContents(map);
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNotify = async () => {
    setNotifying(true);
    const res = await fetch("/api/admin/notify-legal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: activeKey }),
    });
    const data = await res.json();
    if (data.error) toast.error("Error al notificar");
    else toast.success(`Email enviado a ${data.sent} usuario${data.sent !== 1 ? "s" : ""}`);
    setNotifying(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/update-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: activeKey, value: contents[activeKey] ?? "" }),
    });
    const { error } = await res.json();
    if (error) { toast.error("No se pudo guardar"); }
    else { toast.success("Contenido guardado"); }
    setSaving(false);
  };

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xl font-bold mb-6">Editor de contenido legal</h1>

      {/* Tab selector */}
      <div className="flex gap-2 mb-6">
        {PAGES.map((p) => (
          <button
            key={p.key}
            onClick={() => setActiveKey(p.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeKey === p.key
                ? "bg-amber-400 text-zinc-900"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
        </div>
      ) : (
        <div>
          <p className="text-xs text-zinc-500 mb-2">
            Escribí el contenido en texto plano. Usá saltos de línea para separar párrafos y secciones.
            Este texto se mostrará en <strong className="text-zinc-400">/legal/{activeKey}</strong>.
          </p>
          <textarea
            value={contents[activeKey] ?? ""}
            onChange={(e) => setContents((prev) => ({ ...prev, [activeKey]: e.target.value }))}
            className="w-full h-[60vh] bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-400 resize-none font-mono leading-relaxed"
            placeholder={`Escribí el contenido de "${PAGES.find(p => p.key === activeKey)?.label}" acá...`}
          />
          <div className="flex justify-end gap-3 mt-3">
            <Button
              onClick={handleNotify}
              disabled={notifying}
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800"
            >
              {notifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Bell className="w-4 h-4 mr-2" />}
              Notificar cambios
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar cambios
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
