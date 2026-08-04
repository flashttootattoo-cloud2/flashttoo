import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET() {
  const { data } = await sb().from('languages').select('*').order('code')
  return NextResponse.json({ languages: data ?? [] })
}

export async function POST(req: NextRequest) {
  const { code, name, flag } = await req.json()
  if (!code?.trim() || !name?.trim())
    return NextResponse.json({ error: 'code y name son obligatorios' }, { status: 400 })

  const { data, error } = await sb()
    .from('languages')
    .insert({ code: code.trim().toLowerCase(), name: name.trim(), flag: (flag || '').trim() })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ language: data })
}
