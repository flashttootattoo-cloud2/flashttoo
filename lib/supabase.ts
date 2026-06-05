import { createClient } from '@supabase/supabase-js'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(url, key)

export type Artist = {
  id: string
  name: string
  city: string
  country: string
  styles: string[]
  photo_url: string
  instagram: string | null
  whatsapp: string | null
  bio: string | null
  profile_views: number
  instagram_clicks: number
  whatsapp_clicks: number
  likes: number
  visible: boolean
  created_at: string
}
