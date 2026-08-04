import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params

  // Spanish is the base — always load it
  const { data: esData } = await sb()
    .from('translations').select('section, key, value').eq('language_code', 'es')

  const result: Record<string, Record<string, string>> = {}
  for (const row of esData ?? []) {
    if (!result[row.section]) result[row.section] = {}
    result[row.section][row.key] = row.value
  }

  // Overlay target language on top (non-empty values only)
  if (code !== 'es') {
    const { data: langData } = await sb()
      .from('translations').select('section, key, value').eq('language_code', code)
    for (const row of langData ?? []) {
      if (row.value) {
        if (!result[row.section]) result[row.section] = {}
        result[row.section][row.key] = row.value
      }
    }
  }

  return NextResponse.json({ translations: result })
}
