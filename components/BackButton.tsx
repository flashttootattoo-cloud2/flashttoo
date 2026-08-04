'use client'

import { useTranslation } from '@/contexts/TranslationContext'

export default function BackButton() {
  const { t } = useTranslation()
  return (
    <button
      onClick={() => window.history.back()}
      className="text-xs mb-8 inline-block transition-opacity hover:opacity-80"
      style={{ color: 'rgba(255,255,255,0.3)' }}>
      {t('global', 'back', '← volver')}
    </button>
  )
}
