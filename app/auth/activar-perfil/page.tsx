'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from '@/contexts/TranslationContext'

type Step = 'loading' | 'done' | 'error'

export default function ActivarPerfil() {
  const { t } = useTranslation()
  const [step, setStep] = useState<Step>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const token = p.get('token')
    const artist_id = p.get('artist_id')
    const user_id = p.get('user_id')

    if (!token || !artist_id || !user_id) {
      setErrorMsg(t('activar', 'invalid_link', 'El link no es válido.'))
      setStep('error')
      return
    }

    fetch('/api/auth/activar-perfil', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, artist_id, user_id }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.ok) setStep('done')
        else { setErrorMsg(d.error || t('activar', 'error_generic', 'No se pudo activar el perfil.')); setStep('error') }
      })
      .catch(() => { setErrorMsg(t('activar', 'error_connection', 'Error de conexión.')); setStep('error') })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
      <div style={{ width: '100%', maxWidth: 360, background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '32px 24px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Logoprincipal.svg" alt="Flashttoo" style={{ height: 22, marginBottom: 28 }} />

        {step === 'loading' && (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>{t('activar', 'loading', 'Activando tu perfil...')}</p>
        )}

        {step === 'done' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>{t('activar', 'done_title', '¡Tu perfil está activo!')}</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.7 }}>
              {t('activar', 'done_desc', 'Ya podés entrar a editar tu perfil desde el botón')}{' '}
              <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{t('activar', 'done_btn_label', 'Ingresar')}</strong>{' '}
              {t('activar', 'done_desc2', 'con tu mail y contraseña.')}
            </p>
            <a href="/" style={{ display: 'block', textAlign: 'center', background: '#efff42', color: '#000', fontWeight: 700, fontSize: 14, padding: '12px 0', borderRadius: 12, textDecoration: 'none' }}>
              {t('activar', 'done_btn', 'Ir al buscador')}
            </a>
          </div>
        )}

        {step === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>{t('activar', 'error_title', 'No se pudo activar')}</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.6 }}>
              {errorMsg}
            </p>
            <a href="/" style={{ display: 'block', textAlign: 'center', background: '#efff42', color: '#000', fontWeight: 700, fontSize: 14, padding: '12px 0', borderRadius: 12, textDecoration: 'none' }}>
              {t('activar', 'error_btn', 'Ir al inicio')}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
