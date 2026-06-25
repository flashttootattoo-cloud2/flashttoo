import { createClient } from '@supabase/supabase-js'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(url, key)

export type Visit = { from: string; to: string; city: string; country: string }

export type Artist = {
  id: string
  name: string
  city: string
  country: string
  styles: string[]
  photo_url: string
  instagram: string | null
  whatsapp: string | null
  email: string | null
  bio: string | null
  profile_views: number
  instagram_clicks: number
  whatsapp_clicks: number
  likes: number
  visible: boolean
  created_at: string
  interview?: Record<string, string> | null
  visits?: Visit[]
}
