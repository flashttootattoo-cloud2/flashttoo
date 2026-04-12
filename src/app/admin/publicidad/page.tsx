import { createClient } from "@/lib/supabase/server";
import { AdminAdsClient } from "@/components/admin-ads-client";

export default async function AdminPublicidadPage() {
  const supabase = await createClient();
  const { data: ads } = await supabase
    .from("ads")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-6">Publicidad</h1>
      <AdminAdsClient ads={ads ?? []} />
    </div>
  );
}
