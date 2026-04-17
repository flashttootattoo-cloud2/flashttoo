import { createClient } from "@/lib/supabase/server";
import { AdminUsersClient } from "@/components/admin-users-client";

export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, bio, instagram, role, plan, is_blocked, city, country, created_at, followers_count, trust_score_manual, is_verified")
    .order("created_at", { ascending: false })
    .limit(100);

  if (params.q) {
    query = query.or(`full_name.ilike.%${params.q}%,username.ilike.%${params.q}%`);
  }
  if (params.role && params.role !== "all") {
    query = query.eq("role", params.role);
  }

  const { data: users } = await query;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-6">Usuarios</h1>
      <AdminUsersClient users={users ?? []} initialQ={params.q ?? ""} initialRole={params.role ?? "all"} />
    </div>
  );
}
