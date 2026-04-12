import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Si hay un destino explícito (reset de contraseña), ir ahí sin tocar el perfil
      if (next) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      // Flujo de confirmación de email: crear perfil si no existe
      const meta = data.user.user_metadata;
      await supabase.from("profiles").upsert(
        {
          id: data.user.id,
          role: meta?.role ?? "client",
          full_name: meta?.full_name ?? "",
          username: (meta?.username ?? `user_${data.user.id.slice(0, 8)}`)
            .toLowerCase()
            .replace(/\s+/g, "_"),
          city: meta?.city ?? null,
          plan: "free",
        },
        { onConflict: "id", ignoreDuplicates: true }
      );

      if (meta?.role === "tattoo_artist") {
        return NextResponse.redirect(`${origin}/dashboard`);
      }
      return NextResponse.redirect(`${origin}/`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=confirmation_failed`);
}
