import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function checkAuth(req: NextRequest) {
  return req.headers.get('x-admin-pass') === process.env.ADMIN_PASSWORD
}

function hashPw(email: string, pw: string) {
  return createHash('sha256').update(`${email}:${pw}:cultura-flashttoo`).digest('hex')
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await sb().from('cultura_editors').select('id, email, name, created_at').order('created_at', { ascending: false })
  return NextResponse.json({ editors: data ?? [] })
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { email, name, password } = await req.json().catch(() => ({}))
  if (!email || !name || !password) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  const clean = email.toLowerCase().trim()
  const { data: existing } = await sb().from('cultura_editors').select('id').eq('email', clean).single()
  if (existing) return NextResponse.json({ error: 'Email ya registrado' }, { status: 409 })

  const { data, error } = await sb().from('cultura_editors')
    .insert({ email: clean, name: name.trim(), password_hash: hashPw(clean, password) })
    .select('id, email, name, created_at').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ editor: data })
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  await sb().from('cultura_editors').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
