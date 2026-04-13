import { AdminReportsClient } from "@/components/admin-reports-client";

export default function AdminReportesPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-2">Reportes de la comunidad</h1>
      <p className="text-sm text-zinc-500 mb-6">Diseños reportados por usuarios. Podés ocultarlos o descartar el reporte.</p>
      <AdminReportsClient />
    </div>
  );
}
