import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const BASE = 'https://flashttoo.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: artists } = await sb
    .from('artists')
    .select('id, updated_at, created_at')
    .order('created_at', { ascending: false })
    .limit(1000)

  const artistUrls: MetadataRoute.Sitemap = (artists ?? []).map(a => ({
    url: `${BASE}/?artista=${a.id}`,
    lastModified: new Date(a.updated_at ?? a.created_at),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  return [
    {
      url: BASE,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE}/agregar`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    ...artistUrls,
  ]
}
