import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center">
      <p className="text-7xl font-bold text-amber-400 mb-2">404</p>
      <h1 className="text-2xl font-bold text-white mb-2">Página no encontrada</h1>
      <p className="text-zinc-400 mb-8 max-w-sm">
        La página que buscás no existe o fue eliminada.
      </p>
      <div className="flex gap-3">
        <Button asChild className="bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold">
          <Link href="/">
            <Home className="w-4 h-4 mr-2" />
            Inicio
          </Link>
        </Button>
        <Button asChild variant="outline" className="border-zinc-700 hover:bg-zinc-800">
          <Link href="/explore">
            <Search className="w-4 h-4 mr-2" />
            Explorar
          </Link>
        </Button>
      </div>
    </div>
  );
}
