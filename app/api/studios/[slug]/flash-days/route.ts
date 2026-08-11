import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function authorizeStudio(slug: string, edit_key?: string, access_token?: string) {
  const { data: studio } = await sb().from('studios').select('edit_key, name, user_id').eq('slug', slug).single()
  if (!studio) return null
  if (access_token && studio.user_id) {
    const sbAnon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user } } = await sbAnon.auth.getUser(access_token)
    if (user?.id === studio.user_id) return studio as { edit_key: string; name: string; user_id: string }
  }
  if (edit_key && edit_key === studio.edit_key) return studio as { edit_key: string; name: string; user_id: string }
  return null
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await sb().from('flash_days')
    .select('id, flyer_url, date')
    .eq('studio_slug', slug)
    .gte('date', today)
    .order('date', { ascending: true })
  return NextResponse.json({ flashDays: data ?? [] })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { edit_key, access_token, flyer_url, date } = await req.json()

  if (!flyer_url || !date) return NextResponse.json({ error: 'Flyer y fecha son obligatorios' }, { status: 400 })

  const studio = await authorizeStudio(slug, edit_key, access_token)
  if (!studio) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await sb().from('flash_days')
    .insert({ studio_slug: slug, studio_name: studio.name, flyer_url, date })
    .select('id, flyer_url, date').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ flashDay: data })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { edit_key, access_token, id } = await req.json()

  const studio = await authorizeStudio(slug, edit_key, access_token)
  if (!studio) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { error } = await sb().from('flash_days').delete().eq('id', id).eq('studio_slug', slug)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
