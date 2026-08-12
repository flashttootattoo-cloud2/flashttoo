import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { uploadFile } from '@/lib/storage'

function sbAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function sbAnon() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

async function verifyToken(token: string, userId: string) {
  const { data: { user } } = await sbAnon().auth.getUser(token)
  return user?.id === userId
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const sb = sbAdmin()
  const { data: studio, error } = await sb.from('studios').select('*').eq('slug', slug).single()
  if (error || !studio) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  // Non-visible studios only accessible to owner or admin
  if (!studio.visible) {
    const adminPass = req.headers.get('x-admin-pass')
    if (adminPass && adminPass === process.env.ADMIN_PASSWORD) {
      // admin preview — allowed
    } else {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader?.startsWith('Bearer ') || !studio.user_id) {
        return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
      }
      const token = authHeader.slice(7)
      const ok = await verifyToken(token, studio.user_id)
      if (!ok) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }
  }

  const { data: links } = await sb
    .from('studio_artists')
    .select('artist_id, artists(*)')
    .eq('studio_id', studio.id)

  const artists = (links || []).map((l: { artist_id: string; artists: unknown }) => l.artists).filter(Boolean)
  return NextResponse.json({ studio, artists })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const sb = sbAdmin()

  const { data: studio } = await sb.from('studios').select('id, edit_key, logo_url, user_id').eq('slug', slug).single()
  if (!studio) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const contentType = req.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    const fd = await req.formData()
    const key = (fd.get('edit_key') as string)?.trim()
    const token = (fd.get('access_token') as string)?.trim()

    let authorized = false
    if (token && studio.user_id) authorized = await verifyToken(token, studio.user_id)
    if (!authorized && key !== studio.edit_key) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const verify = fd.get('_verify') === 'true'
    if (verify) return NextResponse.json({ ok: true })

    const igRaw = (fd.get('instagram') as string | null)?.trim().replace(/^@/, '').toLowerCase() || null
    if (igRaw) {
      const [{ data: a }, { data: s }] = await Promise.all([
        sb.from('artists').select('id').or(`instagram.ilike.${igRaw},instagram.ilike.@${igRaw}`).limit(1),
        sb.from('studios').select('id').or(`instagram.ilike.${igRaw},instagram.ilike.@${igRaw}`).neq('id', studio.id).limit(1),
      ])
      if (a?.length || s?.length) return NextResponse.json({ error: 'Este Instagram ya está en uso' }, { status: 400 })
    }

    const logo = fd.get('logo') as File | null
    let logo_url = studio.logo_url
    if (logo) { logo_url = await uploadFile(logo, `studio-logos/${Date.now()}.webp`) }

    const allowed = ['name', 'description', 'city', 'country', 'instagram', 'whatsapp', 'website', 'hiring_role']
    const updates: Record<string, unknown> = { logo_url }
    for (const k of allowed) {
      const v = fd.get(k) as string | null
      if (v !== null) updates[k] = v.trim() || null
    }
    const hiringVal = fd.get('hiring')
    if (hiringVal !== null) updates.hiring = hiringVal === 'true'
    const { data, error } = await sb.from('studios').update(updates).eq('id', studio.id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ studio: data })
  }

  const body = await req.json()
  const { edit_key, access_token, _verify, ...fields } = body

  let authorized = false
  if (access_token && studio.user_id) authorized = await verifyToken(access_token, studio.user_id)
  if (!authorized && edit_key !== studio.edit_key) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (_verify) return NextResponse.json({ ok: true })

  if (fields.instagram) {
    const igRaw = (fields.instagram as string).trim().replace(/^@/, '').toLowerCase()
    const [{ data: a }, { data: s }] = await Promise.all([
      sb.from('artists').select('id').or(`instagram.ilike.${igRaw},instagram.ilike.@${igRaw}`).limit(1),
      sb.from('studios').select('id').or(`instagram.ilike.${igRaw},instagram.ilike.@${igRaw}`).neq('id', studio.id).limit(1),
    ])
    if (a?.length || s?.length) return NextResponse.json({ error: 'Este Instagram ya está en uso' }, { status: 400 })
  }

  const allowed = ['name', 'description', 'city', 'country', 'instagram', 'whatsapp', 'website', 'hiring_role']
  const updates: Record<string, unknown> = {}
  for (const k of allowed) { if (k in fields) updates[k] = fields[k] || null }
  if ('hiring' in fields) updates.hiring = Boolean(fields.hiring)
  const { data, error } = await sb.from('studios').update(updates).eq('id', studio.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ studio: data })
}
