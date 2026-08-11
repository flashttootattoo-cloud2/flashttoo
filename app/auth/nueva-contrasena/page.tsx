'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/contexts/TranslationContext'

type Step = 'loading' | 'form' | 'done' | 'error'

export default function NuevaContrasena() {
  const { t } = useTranslation()
  const [step, setStep] = useState<Step>('loading')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type = params.get('type')

    if (type === 'recovery' && accessToken && refreshToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) setStep('error')
          else setStep('form')
        })
    } else {
      setStep('error')
    }
  }, [])

  const handleSubmit = async () => {
    if (!password) { setError(t('password', 'error_required', 'Ingresá una contraseña')); return }
    if (password.length < 8) { setError(t('password', 'error_short', 'La contraseña debe tener al menos 8 caracteres')); return }
    if (password !== confirm) { setError(t('password', 'error_mismatch', 'Las contraseñas no coinciden')); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(t('password', 'error_update', 'No se pudo actualizar la contraseña')); return }
    setStep('done')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
      <div style={{ width: '100%', maxWidth: 360, background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '32px 24px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Logoprincipal.svg" alt="Flashttoo" style={{ height: 22, marginBottom: 28 }} />

        {step === 'loading' && (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>{t('password', 'loading', 'Verificando...')}</p>
        )}

        {step === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>{t('password', 'error_title', 'Link inválido')}</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.6 }}>
              {t('password', 'error_desc', 'Este link expiró o ya fue usado. Pedí uno nuevo desde la app.')}
            </p>
            <a href="/" style={{ display: 'block', textAlign: 'center', background: '#efff42', color: '#000', fontWeight: 700, fontSize: 14, padding: '12px 0', borderRadius: 12, textDecoration: 'none' }}>
              {t('password', 'error_btn', 'Ir al inicio')}
            </a>
          </div>
        )}

        {step === 'form' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{t('password', 'form_title', 'Nueva contraseña')}</p>
            <input
              type="password"
              placeholder={t('password', 'new_placeholder', 'Nueva contraseña')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px', color: '#fff', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }}
            />
            <input
              type="password"
              placeholder={t('password', 'repeat_placeholder', 'Repetir contraseña')}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px', color: '#fff', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }}
            />
            {error && <p style={{ color: 'rgba(255,100,100,0.8)', fontSize: 12 }}>{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ background: '#efff42', color: '#000', fontWeight: 700, fontSize: 14, padding: '13px 0', borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, width: '100%' }}>
              {loading ? t('password', 'saving', 'Guardando...') : t('password', 'save_btn', 'Guardar contraseña')}
            </button>
          </div>
        )}

        {step === 'done' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>{t('password', 'done_title', 'Contraseña actualizada')}</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.6 }}>
              {t('password', 'done_desc', 'Ya podés ingresar con tu nueva contraseña desde el botón "ingresar".')}
            </p>
            <a href="/" style={{ display: 'block', textAlign: 'center', background: '#efff42', color: '#000', fontWeight: 700, fontSize: 14, padding: '12px 0', borderRadius: 12, textDecoration: 'none' }}>
              {t('password', 'done_btn', 'Ir al inicio')}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
