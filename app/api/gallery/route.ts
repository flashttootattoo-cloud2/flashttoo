import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

type GalleryPhoto = {
  artist_id: string
  artist_name: string
  artist_photo: string
  photo_url: string
  artist_instagram: string | null
  artist_city: string | null
  artist_country: string | null
  artist_styles: string[] | null  // efectivo para ordenar (con fallback al artista)
  photo_styles: string[] | null   // solo etiquetas propias de esta foto (para mostrar badge)
}

export async function GET() {
  const { data } = await sb()
    .from('artists')
    .select('id, name, photo_url, gallery_photo_1, gallery_photo_2, gallery_photo_3, gallery_photo_1_styles, gallery_photo_2_styles, gallery_photo_3_styles, instagram, city, country, styles')
    .eq('visible', true)

  if (!data) return NextResponse.json({ photos: [] })

  const photos: GalleryPhoto[] = []
  for (const a of data) {
    for (const key of ['gallery_photo_1', 'gallery_photo_2', 'gallery_photo_3'] as const) {
      const url = a[key as keyof typeof a] as string | null
      const photoStyles = Array.isArray((a as Record<string, unknown>)[`${key}_styles`]) && ((a as Record<string, unknown>)[`${key}_styles`] as string[]).length > 0 ? (a as Record<string, unknown>)[`${key}_styles`] as string[] : null
      const effectiveStyles = photoStyles ?? (Array.isArray(a.styles) ? a.styles : null)
      if (url) photos.push({ artist_id: a.id, artist_name: a.name, artist_photo: a.photo_url, photo_url: url, artist_instagram: a.instagram ?? null, artist_city: a.city ?? null, artist_country: a.country ?? null, artist_styles: effectiveStyles, photo_styles: photoStyles })
    }
  }

  for (let i = photos.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [photos[i], photos[j]] = [photos[j], photos[i]]
  }

  return NextResponse.json({ photos })
}
