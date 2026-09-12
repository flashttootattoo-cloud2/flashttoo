-- Actualiza la Política de Privacidad (ES) para incluir a las marcas registradas
-- y los datos que se dejan al publicar en la comunidad sin registrarse.
-- Ejecutar en Supabase SQL Editor

UPDATE translations
SET value = 'POLÍTICA DE PRIVACIDAD
Flashttoo — Argentina
Última actualización: Agosto 2026

1. RESPONSABLE DEL TRATAMIENTO

Flashttoo (en adelante "nosotros" o "la plataforma") es responsable del tratamiento de los datos personales recopilados a través de flashttoo.com.

2. QUÉ DATOS RECOPILAMOS

De los tatuadores y estudios registrados:
— Nombre artístico o real
— Ciudad y país
— Fotografía de perfil
— Usuario de Instagram
— Número de WhatsApp (opcional)
— Biografía o descripción (opcional)
— Estilos de tatuaje — que el tatuador selecciona
— Respuestas al historial — las preguntas opcionales del perfil (opcional)
— Galería de fotos — hasta 3 imágenes de diseños (opcional)
— Mail de acceso (proporcionado por el tatuador al registrarse)

— Nombre del estudio
— Ciudad y país
— Descripción del estudio (opcional)
— Instagram y WhatsApp del estudio (opcional)
— Fotografía de portada (opcional)
— Mail de acceso

De las marcas registradas:
— Nombre de la marca
— Ciudad y país
— Logo e imágenes de portada (opcional)
— Descripción o biografía (opcional)
— Instagram y WhatsApp (opcional)
— Mail de acceso
— WhatsApp de contacto de cada "Pedido Flash" que la marca decida publicar, junto con el listado de productos y precios de esa oferta

De los visitantes:
— Visitas diarias al sitio (conteo anónimo, sin identificación personal)
— Interacciones con perfiles (vistas, clics en Instagram/WhatsApp, likes)
— Si publicás un mensaje en la comunidad sin registrarte: el nombre, ciudad, país y contacto (Instagram, WhatsApp o email) que decidas incluir en tu publicación

No recopilamos dirección IP, cookies de seguimiento, ni datos de comportamiento de navegación.

Todos los datos solicitados se usan exclusivamente para construir tu perfil público o tu publicación en la comunidad. No existe información oculta — lo que cargás es exactamente lo que aparece en el buscador o en el mensaje publicado. Flashttoo no recopila datos en segundo plano ni información adicional a la que vos decidís compartir.

3. PARA QUÉ USAMOS LOS DATOS

Los datos de tatuadores, estudios y marcas se usan exclusivamente para:
— Mostrar su perfil en el buscador público de Flashttoo
— Permitirles publicar y participar en la comunidad
— Permitirles editar o eliminar su perfil en cualquier momento

Los datos que dejás al publicar en la comunidad (registrado o no) se usan para:
— Mostrar tu mensaje a otros usuarios de la plataforma
— Permitir que te contacten por el medio que vos elegiste incluir

Los datos de visitantes se usan para:
— Estadísticas internas de uso de la plataforma
— No se comparten con terceros

4. COMPARTICIÓN CON TERCEROS

No vendemos, cedemos ni compartimos datos personales con terceros. Los datos se almacenan en los siguientes servicios de infraestructura, sujetos a sus propias políticas de privacidad y seguridad:

Supabase (supabase.com): base de datos y autenticación.
Cloudflare R2 (cloudflare.com): almacenamiento de imágenes y archivos subidos por los usuarios.

5. DERECHOS DEL TITULAR (Ley 25.326)

De acuerdo a la Ley de Protección de Datos Personales de Argentina, tenés derecho a:
— Acceder a tus datos
— Rectificar información incorrecta
— Eliminar tu perfil en cualquier momento usando tu mail y contraseña
— Oponerte al tratamiento de tus datos

Para ejercer estos derechos escribinos a soporte.flashttoo@gmail.com

Usuarios de la Unión Europea
Si accedés a Flashttoo desde la Unión Europea, tus datos son tratados conforme al Reglamento General de Protección de Datos (RGPD/GDPR). Tenés los mismos derechos de acceso, rectificación y eliminación descritos en esta política, ejercibles escribiendo a soporte.flashttoo@gmail.com.

6. ELIMINACIÓN DE DATOS

Los tatuadores y las marcas pueden eliminar su perfil y todos sus datos en cualquier momento directamente desde la plataforma, usando su mail y contraseña. La eliminación es inmediata e irreversible.

Los estudios que deseen eliminar su perfil deben escribirnos a soporte.flashttoo@gmail.com.

Si publicaste un mensaje en la comunidad y querés que lo eliminemos, escribinos a soporte.flashttoo@gmail.com.

Si perdiste el acceso a tu cuenta escribinos a soporte.flashttoo@gmail.com.

7. SEGURIDAD

Implementamos medidas técnicas razonables para proteger la información. Sin embargo, ningún sistema es 100% seguro. En caso de incidente notificaremos a los afectados según lo establece la normativa vigente.

8. MENORES DE EDAD

La plataforma no está dirigida a menores de 18 años. No recopilamos datos de menores de forma intencional.

9. CAMBIOS EN ESTA POLÍTICA

Podemos actualizar esta política ocasionalmente. Los cambios se publicarán en esta misma página con la fecha de actualización. El uso continuado de la plataforma implica aceptación de la política vigente.

10. CONTACTO

Para cualquier consulta sobre privacidad:
soporte.flashttoo@gmail.com
flashttoo.com'
WHERE language_code = 'es' AND section = 'privacidad' AND key = 'content';
