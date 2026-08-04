'use client'

import BackButton from '@/components/BackButton'
import { useTranslation } from '@/contexts/TranslationContext'

export default function PrivacidadPage() {
  const { t } = useTranslation()
  const title   = t('privacidad', 'title',   'Política de Privacidad')
  const content = t('privacidad', 'content', '')

  return (
    <main style={{ background: '#000', minHeight: '100vh', color: '#fff' }}>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <BackButton />
        <h1 className="font-bold mb-8" style={{ fontSize: 22, color: '#efff42' }}>
          {title}
        </h1>
        <div style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, fontSize: 14, whiteSpace: 'pre-wrap' }}>
          {content}
        </div>
      </div>
    </main>
  )
}
