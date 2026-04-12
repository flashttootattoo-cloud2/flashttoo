import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Términos de uso – Flashttoo",
};

export default async function TerminosPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("site_content").select("value").eq("key", "terminos").maybeSingle();
  const dbContent = data?.value;

  if (dbContent) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-zinc-300">
        <h1 className="text-3xl font-bold text-white mb-2">Términos de uso</h1>
        <p className="text-zinc-500 text-sm mb-10">Flashttoo</p>
        <div className="whitespace-pre-wrap text-sm leading-relaxed">{dbContent}</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-zinc-300 prose-zinc">
      <h1 className="text-3xl font-bold text-white mb-2">Términos de uso</h1>
      <p className="text-zinc-500 text-sm mb-10">Última actualización: abril 2025</p>

      <section className="space-y-8">

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">1. Sobre Flashttoo</h2>
          <p className="text-sm leading-relaxed">
            Flashttoo es una plataforma que conecta artistas del tatuaje con clientes interesados en diseños flash.
            Los diseños publicados son de uso único: una vez reservado y tatuado un diseño, deja de estar disponible en la plataforma.
            Flashttoo actúa como intermediario y no es parte de la relación entre el artista y el cliente.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">2. Cuentas y registro</h2>
          <p className="text-sm leading-relaxed">
            Para usar Flashttoo debés crear una cuenta con información veraz. Sos responsable de mantener la
            confidencialidad de tus credenciales. Si detectás un uso no autorizado de tu cuenta, debés notificarnos
            de inmediato a través de los canales de contacto disponibles en la plataforma.
            Podemos suspender o cancelar cuentas que violen estos términos.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">3. Artistas tatuadores</h2>
          <ul className="text-sm leading-relaxed space-y-2 list-disc list-inside">
            <li>Al subir un diseño, confirmás que sos el autor o tenés los derechos para publicarlo.</li>
            <li>Sos responsable de la exactitud del precio, las medidas y la descripción del diseño.</li>
            <li>Flashttoo no garantiza que tus diseños sean reservados ni que recibas clientes.</li>
            <li>El acuerdo final del servicio de tatuaje (fecha, precio, condiciones) es entre vos y el cliente.</li>
            <li>Podés usar los planes de suscripción para acceder a funciones adicionales. Los pagos se procesan a través de PayPal y no son reembolsables salvo disposición legal.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">4. Clientes</h2>
          <ul className="text-sm leading-relaxed space-y-2 list-disc list-inside">
            <li>Una reserva a través de Flashttoo es una expresión de interés, no un contrato de servicio.</li>
            <li>El artista puede aceptar o rechazar la reserva según su disponibilidad.</li>
            <li>El pago del servicio de tatuaje se acuerda directamente con el artista, fuera de la plataforma.</li>
            <li>Flashttoo no se hace responsable por cancelaciones, calidad del servicio ni resultados del tatuaje.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">5. Contenido prohibido</h2>
          <p className="text-sm leading-relaxed">
            Queda prohibido publicar contenido que: infrinja derechos de autor de terceros, sea explícitamente
            sexual sin restricción de edad, incite al odio o discriminación, o sea falso o engañoso.
            Nos reservamos el derecho de eliminar contenido y cancelar cuentas que violen estas reglas sin previo aviso.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">6. Propiedad intelectual</h2>
          <p className="text-sm leading-relaxed">
            Los diseños subidos pertenecen a sus autores. Al publicarlos en Flashttoo, otorgás una licencia
            no exclusiva para mostrarlos dentro de la plataforma con fines de visualización y búsqueda.
            Flashttoo no vende ni cede los diseños a terceros.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">7. Limitación de responsabilidad</h2>
          <p className="text-sm leading-relaxed">
            Flashttoo se provee "tal como está". No garantizamos disponibilidad continua del servicio.
            En ningún caso seremos responsables por daños indirectos, pérdida de ingresos o perjuicios
            derivados del uso o la imposibilidad de uso de la plataforma.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">8. Modificaciones</h2>
          <p className="text-sm leading-relaxed">
            Podemos actualizar estos términos en cualquier momento. Te notificaremos por email ante cambios
            sustanciales. El uso continuado de la plataforma luego de la notificación implica aceptación.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">9. Contacto</h2>
          <p className="text-sm leading-relaxed">
            Para consultas sobre estos términos podés escribirnos a{" "}
            <a href="mailto:hola@flashttoo.com" className="text-amber-400 hover:underline">
              hola@flashttoo.com
            </a>.
          </p>
        </div>

      </section>
    </div>
  );
}
