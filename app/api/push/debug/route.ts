import { NextRequest, NextResponse } from 'next/server'

// Endpoint temporal de diagnóstico — el service worker manda acá cualquier
// cosa rara que le pase al procesar un push, para verlo en los logs de
// Vercel sin necesitar depuración USB del celular.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  console.log('[sw-debug]', JSON.stringify(body))
  return NextResponse.json({ ok: true })
}
