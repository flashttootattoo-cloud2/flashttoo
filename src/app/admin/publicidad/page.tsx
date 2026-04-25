import { createServiceClient } from "@/lib/supabase/service";
import { AdminAdsClient } from "@/components/admin-ads-client";

export const dynamic = "force-dynamic";

export default async function AdminPublicidadPage() {
  const service = createServiceClient();
  const { data: ads } = await service
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
