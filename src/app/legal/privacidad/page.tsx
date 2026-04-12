export const metadata = {
  title: "Política de privacidad – Flashttoo",
};

export default function PrivacidadPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-zinc-300">
      <h1 className="text-3xl font-bold text-white mb-2">Política de privacidad</h1>
      <p className="text-zinc-500 text-sm mb-10">Última actualización: abril 2025</p>

      <section className="space-y-8">

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">1. Qué datos recopilamos</h2>
          <ul className="text-sm leading-relaxed space-y-2 list-disc list-inside">
            <li><strong className="text-white">Datos de registro:</strong> nombre, nombre de usuario, email, contraseña (cifrada), ciudad y rol (cliente o tatuador).</li>
            <li><strong className="text-white">Contenido publicado:</strong> imágenes de diseños, descripciones, precios y datos del perfil del artista.</li>
            <li><strong className="text-white">Actividad en la plataforma:</strong> reservas, mensajes, likes y vistas de diseños.</li>
            <li><strong className="text-white">Datos de pago:</strong> las suscripciones se procesan a través de PayPal. Flashttoo no almacena datos de tarjetas ni información financiera.</li>
            <li><strong className="text-white">Datos técnicos:</strong> logs de acceso, tipo de dispositivo y datos de uso necesarios para el funcionamiento del servicio.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">2. Cómo usamos tus datos</h2>
          <ul className="text-sm leading-relaxed space-y-2 list-disc list-inside">
            <li>Mostrar tu perfil y diseños a otros usuarios.</li>
            <li>Facilitar el contacto entre artistas y clientes.</li>
            <li>Enviarte notificaciones sobre reservas y mensajes (podés desactivarlas).</li>
            <li>Mejorar el ranking y la experiencia de búsqueda dentro de la plataforma.</li>
            <li>Gestionar tu suscripción y facturación.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">3. Con quién compartimos tus datos</h2>
          <p className="text-sm leading-relaxed mb-3">
            No vendemos tus datos a terceros. Trabajamos con los siguientes proveedores de servicios:
          </p>
          <ul className="text-sm leading-relaxed space-y-2 list-disc list-inside">
            <li><strong className="text-white">Supabase:</strong> base de datos y almacenamiento de imágenes (servidores en EE.UU./UE).</li>
            <li><strong className="text-white">PayPal:</strong> procesamiento de pagos de suscripciones.</li>
            <li><strong className="text-white">Vercel:</strong> hosting de la aplicación web.</li>
          </ul>
          <p className="text-sm leading-relaxed mt-3">
            Cada uno de estos proveedores tiene sus propias políticas de privacidad y opera bajo
            sus respectivos marcos legales.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">4. Tus derechos</h2>
          <ul className="text-sm leading-relaxed space-y-2 list-disc list-inside">
            <li><strong className="text-white">Acceso:</strong> podés ver y editar tu información desde la configuración de tu perfil.</li>
            <li><strong className="text-white">Eliminación:</strong> podés solicitar la eliminación de tu cuenta y todos tus datos. Los diseños publicados serán borrados junto con la cuenta.</li>
            <li><strong className="text-white">Portabilidad:</strong> podés solicitarnos una copia de tus datos en formato legible.</li>
            <li><strong className="text-white">Opt-out de notificaciones:</strong> podés desactivar las notificaciones push desde la configuración de tu dispositivo.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">5. Retención de datos</h2>
          <p className="text-sm leading-relaxed">
            Conservamos tus datos mientras tu cuenta esté activa. Si eliminás tu cuenta, borramos
            tu información personal en un plazo de 30 días, excepto la que debamos conservar por
            obligaciones legales o contables.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">6. Seguridad</h2>
          <p className="text-sm leading-relaxed">
            Usamos HTTPS, autenticación segura con Supabase Auth y contraseñas encriptadas con bcrypt.
            Las imágenes se almacenan en buckets privados con acceso controlado.
            Ningún sistema es 100% seguro, pero tomamos medidas razonables para proteger tu información.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">7. Cookies y almacenamiento local</h2>
          <p className="text-sm leading-relaxed">
            Usamos cookies de sesión para mantenerte autenticado y localStorage para preferencias de la app
            (como si cerraste el banner de instalación). No usamos cookies de rastreo ni publicidad de terceros.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">8. Menores de edad</h2>
          <p className="text-sm leading-relaxed">
            Flashttoo está orientado a mayores de 18 años, en línea con las restricciones legales de la industria
            del tatuaje a nivel mundial. No recopilamos intencionalmente datos de menores de 18 años.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">9. Cambios a esta política</h2>
          <p className="text-sm leading-relaxed">
            Podemos actualizar esta política en cualquier momento. Te notificaremos por email si los cambios
            son relevantes para el tratamiento de tus datos.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">10. Contacto</h2>
          <p className="text-sm leading-relaxed">
            Para consultas sobre privacidad o solicitudes de eliminación de datos, escribinos a{" "}
            <a href="mailto:hola@flashttoo.com" className="text-amber-400 hover:underline">
              hola@flashttoo.com
            </a>.
          </p>
        </div>

      </section>
    </div>
  );
}
