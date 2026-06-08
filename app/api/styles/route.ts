import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const DEFAULT_STYLES = [
  'Tradicional','Realismo','Blackwork','Acuarela','Geométrico',
  'Japonés','Neo Tradicional','Minimalista','Old School','Dotwork',
  'Fineline','Lettering','Tribal','Biomecánico','Cover-up','Ornamental','Otros',
]

export async function GET() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await sb.from('settings').select('value').eq('key', 'styles').single()
  const styles = Array.isArray(data?.value) && data.value.length > 0 ? data.value : DEFAULT_STYLES
  return NextResponse.json({ styles })
}
