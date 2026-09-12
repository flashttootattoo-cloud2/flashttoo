-- Actualiza los Términos y Condiciones (ES) para incluir la sección de
-- Marcas / Comunidad / Pedido Flash.
-- Ejecutar en Supabase SQL Editor

UPDATE translations
SET value = 'TÉRMINOS Y CONDICIONES
Flashttoo — Argentina
Última actualización: Agosto 2026

1. ACEPTACIÓN

Al usar Flashttoo (flashttoo.com) aceptás estos términos. Si no estás de acuerdo, no uses la plataforma.

2. QUÉ ES FLASHTTOO

Flashttoo es un directorio online que conecta tatuadores y estudios de tatuaje con personas interesadas en tatuarse. Actuamos como intermediarios y no somos responsables por los servicios prestados entre tatuadores, estudios y clientes.

3. REGISTRO DE PERFILES

Al registrar un perfil en Flashttoo declarás que:
— La información proporcionada es veraz y es tuya
— Las fotografías subidas te pertenecen o tenés autorización para usarlas
— El usuario de Instagram y número de WhatsApp son tuyos o del estudio/marca que representás
— Sos mayor de 18 años

Sos responsable de mantener actualizada tu información y de guardar el acceso a tu cuenta (mail y contraseña). Sin esos datos no podemos recuperar el acceso a tu perfil.

4. ACCESO A TU PERFIL

Al registrarte creás una cuenta con tu mail y una contraseña. Esas credenciales son la única forma de editar o eliminar tu perfil. Si olvidás tu contraseña podés recuperarla desde el botón "Ingresar" usando tu mail. Flashttoo no puede acceder a tu contraseña ni recuperarla por vos.

5. CONTENIDO PROHIBIDO

No está permitido registrar perfiles con:
— Información falsa o que suplante la identidad de otra persona, estudio o marca
— Contenido que promueva discriminación, violencia o actividades ilegales
— Imágenes con derechos de autor sin autorización

Nos reservamos el derecho de eliminar perfiles que incumplan estas condiciones sin previo aviso.

6. MARCAS Y COMUNIDAD (PEDIDO FLASH)

Las marcas registradas en Flashttoo pueden publicar mensajes en la comunidad y ofrecer un listado de productos con precios ("Pedido Flash") para que los tatuadores armen un pedido y lo envíen por WhatsApp.

— La coordinación, el pago y la entrega de los productos se realiza directamente entre la marca y el tatuador, fuera de la plataforma. Flashttoo no interviene ni se responsabiliza por esos acuerdos.
— Los precios, el stock y las condiciones de cada oferta son responsabilidad exclusiva de la marca que las publica.
— El número de WhatsApp indicado en cada oferta debe pertenecer a la marca o a un vendedor autorizado por ella.
— Flashttoo puede limitar la cantidad de mensajes diarios por marca y eliminar publicaciones o perfiles que hagan un uso indebido de la comunidad (spam, información falsa, etc.), sin previo aviso.

7. PROPIEDAD INTELECTUAL

El nombre, logo y diseño de Flashttoo son propiedad de la plataforma. El contenido de los perfiles (fotos, textos) es responsabilidad de cada tatuador, estudio o marca registrado.

8. LIMITACIÓN DE RESPONSABILIDAD

Flashttoo no se responsabiliza por:
— La calidad del trabajo de los tatuadores o estudios listados
— Acuerdos, pagos o conflictos entre tatuadores, estudios, marcas y clientes
— La veracidad de la información publicada por los usuarios registrados
— Interrupciones temporales del servicio

9. BAJA DEL PERFIL

Podés eliminar tu perfil en cualquier momento desde la sección de edición usando tu mail y contraseña. Si perdiste el acceso escribinos a soporte.flashttoo@gmail.com.

10. MODIFICACIONES

Podemos modificar estos términos en cualquier momento. Los cambios se publicarán en esta página. El uso continuado de la plataforma implica aceptación de los nuevos términos.

11. LEY APLICABLE

Estos términos se rigen por las leyes de la República Argentina. Cualquier disputa se resolverá ante los tribunales competentes de Argentina.

12. CONTACTO

soporte.flashttoo@gmail.com
flashttoo.com'
WHERE language_code = 'es' AND section = 'terminos' AND key = 'content';
