import Link from "next/link";
import { Users, Megaphone, FileText, Flag } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const service = createServiceClient();
  const cookieStore = await cookies();
  const seenAt = cookieStore.get("reports_seen_at")?.value;

  let designQuery = service.from("reports").select("id", { count: "exact", head: true });
  let profileQuery = service.from("profile_reports").select("id", { count: "exact", head: true });
  if (seenAt) {
    designQuery = designQuery.gt("created_at", seenAt) as typeof designQuery;
    profileQuery = profileQuery.gt("created_at", seenAt) as typeof profileQuery;
  }
  const [{ count: designCount }, { count: profileCount }] = await Promise.all([
    designQuery,
    profileQuery,
  ]);

  const pendingReports = (designCount ?? 0) + (profileCount ?? 0);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-zinc-950 border-r border-zinc-800 flex flex-col py-6 px-3 gap-1">
        <Link href="/" className="flex items-center gap-2 px-3 mb-6 hover:opacity-80 transition-opacity">
          <span className="text-sm font-bold text-white uppercase tracking-widest">Panel admin</span>
        </Link>

        <Link
          href="/admin/usuarios"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <Users className="w-4 h-4" />
          Usuarios
        </Link>

        <Link
          href="/admin/publicidad"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <Megaphone className="w-4 h-4" />
          Publicidad
        </Link>

        <Link
          href="/admin/reportes"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <Flag className="w-4 h-4" />
          Reportes
          {pendingReports > 0 && (
            <span className="ml-auto min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center leading-none">
              {pendingReports > 99 ? "99+" : pendingReports}
            </span>
          )}
        </Link>

        <Link
          href="/admin/legal"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <FileText className="w-4 h-4" />
          Contenido legal
        </Link>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-zinc-950 overflow-auto">
        {children}
      </main>
    </div>
  );
}
