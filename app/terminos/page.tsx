import { createClient } from '@supabase/supabase-js'
import BackButton from '@/components/BackButton'

export const revalidate = 3600

async function getPage() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await sb.from('legal_pages').select('title, content, updated_at').eq('slug', 'terminos').single()
  return data
}

export default async function TerminosPage() {
  const page = await getPage()

  return (
    <main style={{ background: '#000', minHeight: '100vh', color: '#fff' }}>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <BackButton />
        <h1 className="font-bold mb-2" style={{ fontSize: 22, color: '#efff42' }}>
          {page?.title ?? 'Términos y Condiciones'}
        </h1>
        {page?.updated_at && (
          <p className="mb-8 text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Última actualización: {new Date(page.updated_at).toLocaleDateString('es-AR')}
          </p>
        )}
        <div style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, fontSize: 14, whiteSpace: 'pre-wrap' }}>
          {page?.content}
        </div>
      </div>
    </main>
  )
}
