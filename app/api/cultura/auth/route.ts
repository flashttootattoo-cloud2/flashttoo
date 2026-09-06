import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash, randomUUID } from 'crypto'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function hashPw(email: string, pw: string) {
  return createHash('sha256').update(`${email}:${pw}:cultura-flashttoo`).digest('hex')
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}))
  if (!email || !password) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  const { data: editor } = await sb()
    .from('cultura_editors')
    .select('id, name, password_hash')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (!editor || editor.password_hash !== hashPw(email.toLowerCase().trim(), password)) {
    return NextResponse.json({ error: 'Email o contraseña incorrectos' }, { status: 401 })
  }

  const token = randomUUID()
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  await sb().from('cultura_editors').update({ session_token: token, session_expires_at: expires }).eq('id', editor.id)

  return NextResponse.json({ token, name: editor.name })
}

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return NextResponse.json({ valid: false })

  const { data } = await sb()
    .from('cultura_editors')
    .select('name')
    .eq('session_token', token)
    .gt('session_expires_at', new Date().toISOString())
    .single()

  return NextResponse.json(data ? { valid: true, name: data.name } : { valid: false })
}
