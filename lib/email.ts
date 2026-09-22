import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM || 'info@flashttoo.com'

export async function sendActivationEmail({ to, name, activationUrl }: {
  to: string
  name: string
  activationUrl: string
}) {
  return resend.emails.send({
    from: `Flashttoo <${FROM}>`,
    to,
    subject: 'Activá tu perfil en Flashttoo',
    html: `
      <div style="background:#000;padding:40px 24px;font-family:sans-serif;max-width:480px;margin:0 auto">
        <img src="https://flashttoo.com/Logoprincipal.svg" alt="Flashttoo" style="height:28px;margin-bottom:32px" />
        <p style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.7;margin:0 0 8px">Hola ${name},</p>
        <p style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.7;margin:0 0 32px">
          Tu perfil fue aprobado. Tocá el botón para activarlo y empezar a editar tu información.
        </p>
        <a href="${activationUrl}"
          style="display:inline-block;background:#efff42;color:#000;font-weight:700;font-size:14px;padding:14px 28px;border-radius:10px;text-decoration:none;letter-spacing:0.02em">
          Activar mi perfil
        </a>
        <p style="color:rgba(255,255,255,0.25);font-size:12px;margin-top:32px;line-height:1.6">
          Este link es personal y expira en 48 horas.<br/>
          Si no creaste este perfil podés ignorar este mail.
        </p>
      </div>
    `,
  })
}

export async function sendAccountActivatedEmail({ to, name }: {
  to: string
  name: string
}) {
  return resend.emails.send({
    from: `Flashttoo <${FROM}>`,
    to,
    subject: 'Tu cuenta de Flashttoo ya está activa',
    html: `
      <div style="background:#000;padding:40px 24px;font-family:sans-serif;max-width:480px;margin:0 auto">
        <img src="https://flashttoo.com/Logoprincipal.svg" alt="Flashttoo" style="height:28px;margin-bottom:32px" />
        <p style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.7;margin:0 0 8px">Hola ${name},</p>
        <p style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.7;margin:0 0 32px">
          Tu cuenta en Flashttoo ya está activa. Este mail (${to}) es el que vas a usar para ingresar desde el botón "Ingresar" de la app.
        </p>
        <a href="https://flashttoo.com"
          style="display:inline-block;background:#efff42;color:#000;font-weight:700;font-size:14px;padding:14px 28px;border-radius:10px;text-decoration:none;letter-spacing:0.02em">
          Ir a Flashttoo
        </a>
        <p style="color:rgba(255,255,255,0.25);font-size:12px;margin-top:32px;line-height:1.6">
          Si no activaste esta cuenta, escribinos a info@flashttoo.com.
        </p>
      </div>
    `,
  })
}

export async function sendMigrateEmail({ to, activateUrl }: {
  to: string
  activateUrl: string
}) {
  return resend.emails.send({
    from: `Flashttoo <${FROM}>`,
    to,
    subject: 'Activá tu perfil en Flashttoo',
    html: `
      <div style="background:#000;padding:40px 24px;font-family:sans-serif;max-width:480px;margin:0 auto">
        <img src="https://flashttoo.com/Logoprincipal.svg" alt="Flashttoo" style="height:28px;margin-bottom:32px" />
        <p style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.7;margin:0 0 32px">
          Tocá el botón para activar tu perfil nuevamente. A partir de ahora ingresás con tu mail y contraseña desde el botón "ingresar".
        </p>
        <a href="${activateUrl}"
          style="display:inline-block;background:#efff42;color:#000;font-weight:700;font-size:14px;padding:14px 28px;border-radius:10px;text-decoration:none;letter-spacing:0.02em">
          Activar mi perfil
        </a>
        <p style="color:rgba(255,255,255,0.25);font-size:12px;margin-top:32px;line-height:1.6">
          Este link es personal y expira en 24 horas.<br/>
          Si no solicitaste esto podés ignorar este mail.
        </p>
      </div>
    `,
  })
}

export async function sendPasswordResetEmail({ to, resetUrl }: {
  to: string
  resetUrl: string
}) {
  return resend.emails.send({
    from: `Flashttoo <${FROM}>`,
    to,
    subject: 'Recuperá tu acceso a Flashttoo',
    html: `
      <div style="background:#000;padding:40px 24px;font-family:sans-serif;max-width:480px;margin:0 auto">
        <img src="https://flashttoo.com/Logoprincipal.svg" alt="Flashttoo" style="height:28px;margin-bottom:32px" />
        <p style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.7;margin:0 0 32px">
          Recibimos una solicitud para recuperar el acceso a tu perfil de Flashttoo.
        </p>
        <a href="${resetUrl}"
          style="display:inline-block;background:#efff42;color:#000;font-weight:700;font-size:14px;padding:14px 28px;border-radius:10px;text-decoration:none;letter-spacing:0.02em">
          Crear nueva contraseña
        </a>
        <p style="color:rgba(255,255,255,0.25);font-size:12px;margin-top:32px;line-height:1.6">
          Este link expira en 1 hora.<br/>
          Si no solicitaste esto podés ignorar este mail.
        </p>
      </div>
    `,
  })
}
