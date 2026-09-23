import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Endpoint público pero no listado — mismo criterio que /api/artists/[id]/preview.
// Vive bajo la carpeta [slug] por una restricción de Next.js (no permite mezclar
// nombres de segmento dinámico distintos en el mismo nivel de ruta), pero acá el
// valor recibido es el claim_code del estudio (más corto que el uuid).
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: code } = await params
  const { data } = await sb()
    .from('studios')
    .select('id, name, slug, city, country, description, logo_url, instagram, user_id')
    .eq('claim_code', code)
    .single()

  if (!data) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  return NextResponse.json({
    studio: {
      id: data.id,
      name: data.name,
      city: data.city,
      country: data.country,
      description: data.description,
      logo_url: data.logo_url,
      instagram: data.instagram,
    },
    slug: data.slug,
    claimed: !!data.user_id,
  })
}
