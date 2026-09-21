import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Endpoint público pero no listado — solo accesible por quien tenga el link
// con el id del artista (mismo criterio de "seguridad por oscuridad" que ya
// se usa para /preview/cultura/[id]). Filtra server-side por id y no expone
// campos internos (edit_key, email, etc.)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data } = await sb()
    .from('artists')
    .select('id, name, city, country, styles, bio, photo_url, instagram, user_id')
    .eq('id', id)
    .single()

  if (!data) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  return NextResponse.json({
    artist: {
      id: data.id,
      name: data.name,
      city: data.city,
      country: data.country,
      styles: data.styles ?? [],
      bio: data.bio,
      photo_url: data.photo_url,
      instagram: data.instagram,
    },
    claimed: !!data.user_id,
  })
}
