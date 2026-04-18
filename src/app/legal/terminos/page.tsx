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
    <div className="max-w-3xl mx-auto px-4 py-12 text-zinc-300">
      <h1 className="text-3xl font-bold text-white mb-2">Términos de uso</h1>
      <p className="text-zinc-500 text-sm mb-10">Última actualización: abril 2025</p>

      <section className="space-y-8">

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">1. Sobre Flashttoo</h2>
          <p className="text-sm leading-relaxed">
            Flashttoo es una plataforma digital que conecta artistas del tatuaje con clientes interesados en diseños flash.
            Los diseños publicados son de uso único: una vez reservado y tatuado un diseño, deja de estar disponible en la plataforma.
            Flashttoo actúa como intermediario y no es parte de la relación contractual entre el artista y el cliente.
            El uso de la plataforma implica la aceptación plena de estos términos.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">2. Cuentas y registro</h2>
          <p className="text-sm leading-relaxed mb-2">
            Para usar Flashttoo debés crear una cuenta con información veraz y actualizada. Existen dos tipos de cuenta:
          </p>
          <ul className="text-sm leading-relaxed space-y-2 list-disc list-inside mb-2">
            <li><strong className="text-white">Cliente:</strong> puede explorar diseños, guardarlos, seguir artistas, enviar mensajes y recibir notificaciones de nuevos diseños de los artistas que sigue.</li>
            <li><strong className="text-white">Artista tatuador:</strong> puede publicar diseños flash, gestionar reservas, acceder al dashboard, y recibir mensajes de clientes.</li>
          </ul>
          <p className="text-sm leading-relaxed">
            Sos responsable de mantener la confidencialidad de tus credenciales. Si detectás un uso no autorizado de tu cuenta,
            debés notificarnos de inmediato a <a href="mailto:hola@flashttoo.com" className="text-amber-400 hover:underline">hola@flashttoo.com</a>.
            Podemos suspender o bloquear cuentas que violen estos términos sin previo aviso.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">3. Artistas tatuadores</h2>
          <ul className="text-sm leading-relaxed space-y-2 list-disc list-inside">
            <li>Al subir un diseño confirmás que sos el autor o tenés los derechos para publicarlo.</li>
            <li>Sos responsable de la exactitud del precio, las medidas, el estilo y la descripción del diseño.</li>
            <li>Flashttoo no garantiza que tus diseños sean reservados ni que recibas clientes.</li>
            <li>El acuerdo final del servicio de tatuaje (fecha, precio, lugar, condiciones) es entre vos y el cliente, fuera de la plataforma.</li>
            <li>Podés acceder a planes de suscripción (Pro, Premium, Estudio) para publicar más diseños y acceder a funciones adicionales. Los pagos se procesan a través de PayPal y no son reembolsables salvo disposición legal.</li>
            <li>Tu perfil cuenta con un <strong className="text-white">puntaje de confianza</strong> que puede ajustarse en función de tu actividad y reportes recibidos. Un puntaje bajo puede afectar tu visibilidad en la plataforma.</li>
            <li>Una vez que tu perfil acumula suficiente reputación, el equipo de Flashttoo puede otorgarte la insignia de <strong className="text-white">Verificado</strong> de forma manual.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">4. Clientes</h2>
          <ul className="text-sm leading-relaxed space-y-2 list-disc list-inside">
            <li>Una reserva a través de Flashttoo es una expresión de interés, no un contrato de servicio.</li>
            <li>El artista puede aceptar o rechazar la reserva según su disponibilidad.</li>
            <li>El pago del servicio de tatuaje se acuerda directamente con el artista, fuera de la plataforma.</li>
            <li>Flashttoo no se hace responsable por cancelaciones, calidad del servicio ni resultados del tatuaje.</li>
            <li>Podés seguir artistas y recibir notificaciones push cuando publiquen nuevos diseños, si otorgás el permiso correspondiente en tu dispositivo.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">5. Sistema de mensajería</h2>
          <p className="text-sm leading-relaxed">
            La plataforma incluye un sistema de mensajería privada entre clientes y artistas. Los mensajes son privados
            y no son leídos por Flashttoo salvo requerimiento legal o investigación de denuncias graves.
            Queda prohibido usar la mensajería para enviar spam, contenido ofensivo, engañoso o ilegal.
            Podés eliminar conversaciones desde tu panel de mensajes. Flashttoo puede eliminar conversaciones
            que violen estos términos.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">6. Notificaciones push</h2>
          <p className="text-sm leading-relaxed">
            Si otorgás permiso, la plataforma puede enviarte notificaciones push a tu dispositivo para avisarte
            de nuevos mensajes y actividad relevante. Podés revocar este permiso en cualquier momento desde
            la configuración de notificaciones de tu navegador o dispositivo. Las suscripciones push se almacenan
            de forma segura y se eliminan automáticamente cuando dejan de ser válidas.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">7. Sistema de reportes</h2>
          <p className="text-sm leading-relaxed mb-2">
            Flashttoo cuenta con un sistema de reportes para mantener la comunidad segura:
          </p>
          <ul className="text-sm leading-relaxed space-y-2 list-disc list-inside">
            <li>Podés reportar diseños que consideres inapropiados o que infrinjan derechos de autor.</li>
            <li>Podés reportar perfiles de artistas por conducta inapropiada, cuenta falsa, spam u otros motivos. Solo podés reportar el mismo perfil una vez cada 7 días.</li>
            <li>Los reportes son revisados por el equipo de administración. Flashttoo se reserva el derecho de eliminar contenido o bloquear cuentas según el resultado de la revisión.</li>
            <li>El uso del sistema de reportes de forma abusiva o malintencionada puede resultar en la suspensión de tu cuenta.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">8. Publicidad</h2>
          <p className="text-sm leading-relaxed">
            Flashttoo puede mostrar publicidad de terceros dentro de la plataforma. Los anuncios están claramente
            identificados. Flashttoo no es responsable del contenido de los sitios externos a los que dirijan los anuncios.
            Los clics en publicidad son registrados con fines estadísticos.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">9. Contenido prohibido</h2>
          <p className="text-sm leading-relaxed">
            Queda prohibido publicar contenido que: infrinja derechos de autor de terceros, sea explícitamente
            sexual sin restricción de edad adecuada, incite al odio, discriminación o violencia, sea falso o engañoso,
            o promueva actividades ilegales. Nos reservamos el derecho de eliminar contenido y cancelar cuentas
            que violen estas reglas sin previo aviso.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">10. Propiedad intelectual</h2>
          <p className="text-sm leading-relaxed">
            Los diseños subidos pertenecen a sus autores. Al publicarlos en Flashttoo, otorgás una licencia
            no exclusiva para mostrarlos dentro de la plataforma con fines de visualización y búsqueda.
            Flashttoo no vende ni cede los diseños a terceros. El logo, nombre y elementos de marca de
            Flashttoo son propiedad exclusiva de la plataforma.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">11. Limitación de responsabilidad</h2>
          <p className="text-sm leading-relaxed">
            Flashttoo se provee "tal como está". No garantizamos disponibilidad continua del servicio.
            En ningún caso seremos responsables por daños indirectos, pérdida de ingresos, pérdida de datos
            o perjuicios derivados del uso o la imposibilidad de uso de la plataforma, incluyendo fallas
            en el sistema de notificaciones, mensajería o reservas.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">12. Modificaciones</h2>
          <p className="text-sm leading-relaxed">
            Podemos actualizar estos términos en cualquier momento. Te notificaremos por email ante cambios
            sustanciales. El uso continuado de la plataforma luego de la notificación implica aceptación de los nuevos términos.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">13. Contacto</h2>
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
