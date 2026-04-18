import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Flashttoo <hola@flashttoo.com>";

// ─── Email templates ──────────────────────────────────────────────────────────

function baseLayout(content: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Flashttoo</title>
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <!-- Logo -->
        <tr><td align="center" style="padding-bottom:32px;">
          <img src="https://flashttoo.com/Logoprincipal.svg"
               alt="Flashttoo" height="36"
               style="display:block;height:36px;width:auto;" />
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#18181b;border:1px solid #27272a;border-radius:16px;padding:40px 36px;">
          ${content}
        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding-top:28px;font-size:12px;color:#52525b;line-height:1.6;">
          Flashttoo · Diseños flash para tatuar<br/>
          Si no pediste esto, ignorá este email.
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function confirmEmail(name: string, confirmUrl: string) {
  const display = name || "artista";
  return baseLayout(`
    <div style="width:48px;height:48px;background:rgba(251,191,36,0.12);border-radius:12px;
                display:flex;align-items:center;justify-content:center;margin-bottom:24px;">
      <span style="font-size:24px;">✦</span>
    </div>

    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">
      Bienvenido a Flashttoo
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#a1a1aa;line-height:1.6;">
      Hola ${display}, confirmá tu email para activar tu cuenta y empezar a explorar diseños flash.
    </p>

    <a href="${confirmUrl}"
       style="display:inline-block;background:#fbbf24;color:#09090b;font-size:15px;
              font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;
              letter-spacing:0.01em;">
      Confirmar mi cuenta
    </a>

    <p style="margin:28px 0 0;font-size:13px;color:#52525b;line-height:1.6;">
      El enlace expira en 24 horas.<br/>
      Si no creaste esta cuenta, ignorá este mensaje.
    </p>
  `);
}

function resetPassword(name: string, resetUrl: string) {
  const display = name || "usuario";
  return baseLayout(`
    <div style="width:48px;height:48px;background:rgba(239,68,68,0.1);border-radius:12px;
                display:flex;align-items:center;justify-content:center;margin-bottom:24px;">
      <span style="font-size:24px;">🔑</span>
    </div>

    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">
      Restablecer contraseña
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#a1a1aa;line-height:1.6;">
      Hola ${display}, recibimos una solicitud para cambiar la contraseña de tu cuenta.
      Tocá el botón para crear una nueva.
    </p>

    <a href="${resetUrl}"
       style="display:inline-block;background:#fbbf24;color:#09090b;font-size:15px;
              font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;
              letter-spacing:0.01em;">
      Cambiar contraseña
    </a>

    <p style="margin:28px 0 0;font-size:13px;color:#52525b;line-height:1.6;">
      El enlace expira en 1 hora.<br/>
      Si no pediste esto, tu contraseña sigue siendo la misma — podés ignorar este mensaje.
    </p>
  `);
}

function magicLink(name: string, url: string) {
  const display = name || "usuario";
  return baseLayout(`
    <div style="width:48px;height:48px;background:rgba(251,191,36,0.12);border-radius:12px;
                display:flex;align-items:center;justify-content:center;margin-bottom:24px;">
      <span style="font-size:24px;">⚡</span>
    </div>

    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">
      Tu enlace de acceso
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#a1a1aa;line-height:1.6;">
      Hola ${display}, usá este enlace para iniciar sesión en Flashttoo. Solo funciona una vez.
    </p>

    <a href="${url}"
       style="display:inline-block;background:#fbbf24;color:#09090b;font-size:15px;
              font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;
              letter-spacing:0.01em;">
      Entrar a Flashttoo
    </a>

    <p style="margin:28px 0 0;font-size:13px;color:#52525b;line-height:1.6;">
      El enlace expira en 1 hora.<br/>
      Si no pediste esto, ignorá este mensaje.
    </p>
  `);
}

// ─── Core send logic ─────────────────────────────────────────────────────────

type HookBody = {
  user: { email: string; user_metadata?: { full_name?: string; name?: string } };
  email_data: {
    email_action_type: string;
    token_hash: string;
    redirect_to: string;
    site_url: string;
  };
};

async function handleEmail(body: HookBody): Promise<NextResponse> {
  const { user, email_data } = body;
  const { email_action_type, token_hash, redirect_to, site_url } = email_data;
  const to = user.email;
  const name = user.user_metadata?.full_name ?? user.user_metadata?.name ?? "";

  const verifyBase = `${site_url}/verify?token=${token_hash}`;
  const confirmUrl = `${verifyBase}&type=signup&redirect_to=${encodeURIComponent(redirect_to)}`;
  // Bypass PKCE for recovery — send token_hash directly to the page so verifyOtp
  // works cross-browser without needing the code verifier cookie.
  const resetUrl   = `https://www.flashttoo.com/auth/reset-password?token_hash=${token_hash}&type=recovery`;
  const magicUrl   = `${verifyBase}&type=magiclink&redirect_to=${encodeURIComponent(redirect_to)}`;

  let subject = "";
  let html = "";

  switch (email_action_type) {
    case "signup":
    case "email_change_new":
      subject = "Confirmá tu cuenta en Flashttoo";
      html = confirmEmail(name, confirmUrl);
      break;
    case "recovery":
      subject = "Restablecer contraseña – Flashttoo";
      html = resetPassword(name, resetUrl);
      break;
    case "magiclink":
      subject = "Tu enlace de acceso a Flashttoo";
      html = magicLink(name, magicUrl);
      break;
    default:
      return NextResponse.json({ error: "Unknown action type" }, { status: 400 });
  }

  const { error } = await resend.emails.send({ from: FROM, to, subject, html });

  if (error) {
    console.error("[email-hook] Resend error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Email sent" });
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  let body: HookBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  return handleEmail(body);
}
