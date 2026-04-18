import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Política de privacidad – Flashttoo",
};

export default async function PrivacidadPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("site_content").select("value").eq("key", "privacidad").maybeSingle();
  const dbContent = data?.value;

  if (dbContent) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-zinc-300">
        <h1 className="text-3xl font-bold text-white mb-2">Política de privacidad</h1>
        <p className="text-zinc-500 text-sm mb-10">Flashttoo</p>
        <div className="whitespace-pre-wrap text-sm leading-relaxed">{dbContent}</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-zinc-300">
      <h1 className="text-3xl font-bold text-white mb-2">Política de privacidad</h1>
      <p className="text-zinc-500 text-sm mb-10">Última actualización: abril 2025</p>

      <section className="space-y-8">

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">1. Qué datos recopilamos</h2>
          <ul className="text-sm leading-relaxed space-y-2 list-disc list-inside">
            <li><strong className="text-white">Datos de registro:</strong> nombre completo, nombre de usuario, dirección de email, contraseña (cifrada), ciudad y rol en la plataforma (cliente o tatuador).</li>
            <li><strong className="text-white">Datos de perfil:</strong> foto de perfil, biografía, Instagram, ciudad, estilo de tatuaje y otra información que elijas agregar.</li>
            <li><strong className="text-white">Contenido publicado:</strong> imágenes de diseños flash, títulos, descripciones, precios, medidas y estilos.</li>
            <li><strong className="text-white">Actividad en la plataforma:</strong> diseños guardados, artistas seguidos, mensajes enviados, reservas realizadas y reportes enviados.</li>
            <li><strong className="text-white">Notificaciones push:</strong> si otorgás permiso, almacenamos tu suscripción push (endpoint y claves criptográficas) para enviarte notificaciones a tu dispositivo.</li>
            <li><strong className="text-white">Datos de pago:</strong> las suscripciones se procesan a través de PayPal. Flashttoo no almacena datos de tarjetas ni información financiera sensible.</li>
            <li><strong className="text-white">Datos técnicos:</strong> logs de acceso, tipo de dispositivo, sistema operativo y datos de uso necesarios para el funcionamiento y la seguridad del servicio.</li>
            <li><strong className="text-white">Publicidad:</strong> registramos clics en anuncios con fines estadísticos, sin rastreo individual entre sesiones.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">2. Cómo usamos tus datos</h2>
          <ul className="text-sm leading-relaxed space-y-2 list-disc list-inside">
            <li>Mostrar tu perfil y diseños a otros usuarios de la plataforma.</li>
            <li>Facilitar el contacto y la mensajería privada entre artistas y clientes.</li>
            <li>Enviarte notificaciones push sobre nuevos mensajes y actividad relevante (solo si autorizás).</li>
            <li>Enviarte emails transaccionales: confirmación de cuenta, restablecimiento de contraseña y avisos importantes.</li>
            <li>Calcular y mostrar tu puntaje de confianza en base a tu actividad y los reportes recibidos.</li>
            <li>Gestionar el sistema de reportes y moderar contenido inapropiado.</li>
            <li>Gestionar tu suscripción y el acceso a funciones según tu plan.</li>
            <li>Mejorar el algoritmo de búsqueda y la experiencia general de la plataforma.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">3. Con quién compartimos tus datos</h2>
          <p className="text-sm leading-relaxed mb-3">
            No vendemos tus datos a terceros. Trabajamos con los siguientes proveedores de confianza:
          </p>
          <ul className="text-sm leading-relaxed space-y-2 list-disc list-inside">
            <li><strong className="text-white">Supabase:</strong> base de datos, autenticación y almacenamiento de imágenes. Servidores en EE.UU./UE bajo el marco Privacy Shield y GDPR.</li>
            <li><strong className="text-white">Vercel:</strong> hosting y despliegue de la aplicación web.</li>
            <li><strong className="text-white">Resend:</strong> envío de emails transaccionales (confirmación de cuenta, recuperación de contraseña).</li>
            <li><strong className="text-white">PayPal:</strong> procesamiento de pagos de suscripciones.</li>
            <li><strong className="text-white">Google / Mozilla / Apple Push Services:</strong> entrega de notificaciones push a dispositivos, a través del estándar Web Push.</li>
          </ul>
          <p className="text-sm leading-relaxed mt-3">
            Cada proveedor tiene sus propias políticas de privacidad y opera bajo sus marcos legales correspondientes.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">4. Notificaciones push y service worker</h2>
          <p className="text-sm leading-relaxed">
            Si otorgás permiso de notificaciones en tu dispositivo, la plataforma registra una suscripción push
            (compuesta por un endpoint URL y claves criptográficas) en nuestra base de datos. Esta suscripción
            se usa exclusivamente para enviarte notificaciones de mensajes nuevos y actividad de los artistas que seguís.
            No se comparte con terceros ni se usa con fines publicitarios. Podés revocar el permiso en cualquier
            momento desde la configuración de notificaciones de tu navegador. Las suscripciones inválidas o expiradas
            se eliminan automáticamente de nuestra base de datos.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">5. Puntaje de confianza</h2>
          <p className="text-sm leading-relaxed">
            Los perfiles de artistas tienen un puntaje de confianza visible públicamente que refleja su reputación
            en la plataforma. Este puntaje puede verse afectado por reportes de otros usuarios y es ajustable
            manualmente por el equipo de administración de Flashttoo. La insignia de "Verificado" se otorga
            de forma manual por el equipo de Flashttoo. No compartimos los detalles internos del cálculo del puntaje.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">6. Tus derechos</h2>
          <ul className="text-sm leading-relaxed space-y-2 list-disc list-inside">
            <li><strong className="text-white">Acceso y edición:</strong> podés ver y editar tu información desde la configuración de tu perfil en cualquier momento.</li>
            <li><strong className="text-white">Eliminación:</strong> podés solicitar la eliminación de tu cuenta y todos tus datos escribiéndonos a hola@flashttoo.com. Los diseños y mensajes asociados serán eliminados junto con la cuenta.</li>
            <li><strong className="text-white">Portabilidad:</strong> podés solicitar una copia de tus datos en formato legible.</li>
            <li><strong className="text-white">Opt-out de notificaciones push:</strong> podés desactivarlas desde la configuración de notificaciones de tu navegador o sistema operativo.</li>
            <li><strong className="text-white">Opt-out de emails:</strong> los emails transaccionales son necesarios para el funcionamiento de la cuenta (confirmación, recuperación de contraseña) y no pueden desactivarse.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">7. Retención de datos</h2>
          <p className="text-sm leading-relaxed">
            Conservamos tus datos mientras tu cuenta esté activa. Si eliminás tu cuenta, borramos
            tu información personal en un plazo de 30 días, excepto la que debamos conservar por
            obligaciones legales o contables. Las notificaciones push antiguas se eliminan automáticamente
            mediante tareas de limpieza periódicas.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">8. Seguridad</h2>
          <p className="text-sm leading-relaxed">
            Usamos HTTPS en todas las comunicaciones, autenticación segura con Supabase Auth, contraseñas
            encriptadas, y claves VAPID para la autenticación de notificaciones push. Las imágenes se almacenan
            en buckets con acceso controlado. Los emails de recuperación de contraseña usan el flujo PKCE
            de Supabase para proteger las credenciales. Ningún sistema es 100% seguro, pero tomamos
            medidas razonables para proteger tu información.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">9. Cookies y almacenamiento local</h2>
          <p className="text-sm leading-relaxed">
            Usamos cookies de sesión para mantenerte autenticado y localStorage para preferencias de la app
            (como el registro de conversaciones leídas). El service worker utiliza caché local para el
            funcionamiento de las notificaciones push. No usamos cookies de rastreo publicitario de terceros.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">10. Menores de edad</h2>
          <p className="text-sm leading-relaxed">
            Flashttoo está orientado a mayores de 18 años, en línea con las restricciones legales de la industria
            del tatuaje. No recopilamos intencionalmente datos de menores de 18 años. Si detectamos que un usuario
            es menor de edad, procederemos a eliminar su cuenta.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">11. Cambios a esta política</h2>
          <p className="text-sm leading-relaxed">
            Podemos actualizar esta política en cualquier momento. Te notificaremos por email si los cambios
            son relevantes para el tratamiento de tus datos personales.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">12. Contacto</h2>
          <p className="text-sm leading-relaxed">
            Para consultas sobre privacidad, solicitudes de eliminación de datos o ejercicio de tus derechos, escribinos a{" "}
            <a href="mailto:hola@flashttoo.com" className="text-amber-400 hover:underline">
              hola@flashttoo.com
            </a>.
          </p>
        </div>

      </section>
    </div>
  );
}
