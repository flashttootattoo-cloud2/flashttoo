import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
