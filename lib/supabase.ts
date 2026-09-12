import { createClient } from '@supabase/supabase-js'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(url, key)

export type Visit = { from: string; to: string; city: string; country: string }

export type Studio = {
  id: string
  name: string
  slug: string
  city: string | null
  country: string | null
  description: string | null
  logo_url: string | null
  instagram: string | null
  whatsapp: string | null
  website: string | null
  visible: boolean
  hiring: boolean
  hiring_role: string | null
  profile_views: number
  instagram_clicks: number
  whatsapp_clicks: number
  website_clicks: number
  created_at: string
  preview_artists?: { artist_id: string; name: string; photo_url: string }[]
  styles?: string[]
}

export type Artist = {
  id: string
  name: string
  slug: string
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
  gallery_photo_1?: string | null
  gallery_photo_2?: string | null
  gallery_photo_3?: string | null
  pending_reason?: string | null
  auth_email?: string | null
  show_email?: boolean | null
  flashbook_alias?: string | null
  invited_by_name?: string | null
  invited_by_admin?: boolean | null
}
