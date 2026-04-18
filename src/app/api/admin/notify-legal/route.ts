import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Flashttoo <hola@flashttoo.com>";

const LABELS: Record<string, { title: string; url: string }> = {
  terminos:   { title: "Términos de uso",        url: "https://www.flashttoo.com/legal/terminos" },
  privacidad: { title: "Política de privacidad", url: "https://www.flashttoo.com/legal/privacidad" },
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "administradorgeneral") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { key } = await req.json();
  const page = LABELS[key];
  if (!page) return NextResponse.json({ error: "Invalid key" }, { status: 400 });

  const service = createServiceClient();

  // Get all user emails via admin API
  const { data: { users }, error: usersError } = await service.auth.admin.listUsers({ perPage: 1000 });
  if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 });

  const emails = users.map((u) => u.email).filter(Boolean) as string[];
  if (emails.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  const subject = `Actualizamos nuestra ${page.title} – Flashttoo`;
  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td align="center" style="padding-bottom:32px;">
          <img src="https://www.flashttoo.com/Logoprincipal.svg" alt="Flashttoo" height="36" style="display:block;height:36px;width:auto;"/>
        </td></tr>
        <tr><td style="background:#18181b;border:1px solid #27272a;border-radius:16px;padding:40px 36px;">
          <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#ffffff;">Actualizamos nuestra ${page.title}</h1>
          <p style="margin:0 0 20px;font-size:15px;color:#a1a1aa;line-height:1.6;">
            Hemos realizado cambios en nuestra ${page.title}. Te recomendamos leerla para mantenerte informado sobre cómo usamos y protegemos tus datos.
          </p>
          <a href="${page.url}"
             style="display:inline-block;background:#fbbf24;color:#09090b;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;">
            Ver ${page.title}
          </a>
          <p style="margin:28px 0 0;font-size:13px;color:#52525b;line-height:1.6;">
            Si tenés preguntas podés escribirnos a hola@flashttoo.com
          </p>
        </td></tr>
        <tr><td align="center" style="padding-top:28px;font-size:12px;color:#52525b;">
          Flashttoo · Diseños flash para tatuar
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // Resend batch: max 100 per call
  const BATCH = 100;
  let sent = 0;
  for (let i = 0; i < emails.length; i += BATCH) {
    const chunk = emails.slice(i, i + BATCH);
    const batch = chunk.map((to) => ({ from: FROM, to, subject, html }));
    const { error } = await resend.batch.send(batch);
    if (error) console.error("[notify-legal] batch error:", error);
    else sent += chunk.length;
  }

  return NextResponse.json({ ok: true, sent });
}
