import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await sb
    .from('studios')
    .select('id, hiring, hiring_role')
    .limit(1)

  if (!error) {
    return NextResponse.json({ ok: true, message: 'Columnas hiring y hiring_role ya existen ✓' })
  }

  return NextResponse.json({
    ok: false,
    message: 'Faltan las columnas. Corré este SQL en el Supabase Dashboard (SQL Editor):',
    sql: [
      "ALTER TABLE studios ADD COLUMN IF NOT EXISTS hiring boolean NOT NULL DEFAULT false;",
      "ALTER TABLE studios ADD COLUMN IF NOT EXISTS hiring_role text NOT NULL DEFAULT 'tatuador';",
    ].join('\n'),
    supabaseError: error.message,
  })
}
