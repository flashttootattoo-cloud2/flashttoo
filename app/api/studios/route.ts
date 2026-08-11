import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function slugify(name: string) {
  return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { user_id, email, name, city, country, instagram, whatsapp, website, description } = body
  if (!user_id || !email) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  if (!name?.trim()) return NextResponse.json({ error: 'El nombre del estudio es requerido' }, { status: 400 })

  const sbSvc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Verify user_id corresponds to email
  const { data: { user } } = await sbSvc.auth.admin.getUserById(user_id)
  if (!user || user.email !== email.toLowerCase()) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Check no studio already exists for this user
  const { data: dup } = await sbSvc.from('studios').select('id, slug').eq('user_id', user_id).limit(1)
  if (dup?.length) return NextResponse.json({ error: 'Ya existe un estudio para este usuario', slug: dup[0].slug }, { status: 409 })

  const rawSlug = slugify(name.trim())
  let slug = rawSlug
  const { data: existingSlug } = await sbSvc.from('studios').select('slug').eq('slug', slug).limit(1)
  if (existingSlug?.length) slug = `${rawSlug}-${Date.now()}`

  const igRaw = instagram?.trim().replace(/^@/, '').toLowerCase() || null
  if (igRaw) {
    const [{ data: a }, { data: s }] = await Promise.all([
      sbSvc.from('artists').select('id').or(`instagram.ilike.${igRaw},instagram.ilike.@${igRaw}`).limit(1),
      sbSvc.from('studios').select('id').or(`instagram.ilike.${igRaw},instagram.ilike.@${igRaw}`).limit(1),
    ])
    if (a?.length || s?.length) return NextResponse.json({ error: 'Este Instagram ya está en uso' }, { status: 400 })
  }

  const { data: studio, error } = await sbSvc.from('studios').insert({
    name: name.trim(),
    slug,
    city: city?.trim() || null,
    country: country?.trim() || null,
    description: description?.trim() || null,
    instagram: igRaw,
    whatsapp: whatsapp?.trim() || null,
    website: website?.trim() || null,
    user_id,
    auth_email: email.toLowerCase(),
    visible: false,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ studio })
}

export async function GET() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const now = new Date().toISOString()
  const { data: studios } = await sb.from('studios').select('*').eq('visible', true)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false })
  if (!studios || studios.length === 0) return NextResponse.json({ studios: [] })

  // Attach up to 4 artist previews per studio
  const results = await Promise.all(
    studios.map(async (studio) => {
      const { data: links } = await sb
        .from('studio_artists')
        .select('artist_id, artists(id, name, photo_url, styles)')
        .eq('studio_id', studio.id)
        .limit(4)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const preview_artists = ((links || []) as any[]).map((l) => {
        const a = Array.isArray(l.artists) ? l.artists[0] : l.artists
        return { artist_id: l.artist_id as string, name: (a?.name || '') as string, photo_url: (a?.photo_url || '') as string }
      })
      const styles: string[] = []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const l of ((links || []) as any[])) {
        const a = Array.isArray(l.artists) ? l.artists[0] : l.artists
        if (Array.isArray(a?.styles)) for (const s of a.styles) if (!styles.includes(s)) styles.push(s)
      }
      return { ...studio, preview_artists, styles }
    })
  )

  return NextResponse.json({ studios: results })
}
