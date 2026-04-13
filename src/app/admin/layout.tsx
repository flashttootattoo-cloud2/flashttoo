import Link from "next/link";
import Image from "next/image";
import { Users, Megaphone, FileText } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-zinc-950 border-r border-zinc-800 flex flex-col py-6 px-3 gap-1">
        <Link href="/" className="flex items-center gap-2 px-3 mb-6 hover:opacity-80 transition-opacity">
          <Image src="/logo.png" alt="Flashttoo" width={120} height={32} className="h-8 w-auto" />
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
