'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '@/contexts/TranslationContext'

type View = 'register' | 'registered' | 'terms' | 'privacy'

export default function RegistrarEstudio() {
  const { t } = useTranslation()
  const [view, setView] = useState<View>('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [tyc, setTyc] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (view === 'terms' || view === 'privacy') {
      history.pushState({ doc: view }, '')
      const handler = () => setView('register')
      window.addEventListener('popstate', handler)
      return () => window.removeEventListener('popstate', handler)
    }
  }, [view])

  const handleRegister = async () => {
    if (!tyc) { setError(t('ingresar', 'error_tyc', 'Tenés que aceptar los términos para continuar')); return }
    if (!email || !password) { setError(t('ingresar', 'error_fields', 'Completá email y contraseña')); return }
    if (password.length < 8) { setError(t('ingresar', 'error_password_short', 'La contraseña debe tener al menos 8 caracteres')); return }
    setLoading(true); setError('')
    const r = await fetch('/api/auth/register-studio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const d = await r.json()
    setLoading(false)
    if (!r.ok) { setError(d.error); return }
    setView('registered')
  }

  if (view === 'terms' || view === 'privacy') {
    return (
      <div className="fixed inset-0 flex flex-col" style={{ background: '#000' }}>
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={() => setView('register')} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 20, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}>←</button>
          <p className="text-sm font-bold text-white">
            {view === 'terms' ? t('terminos', 'title', 'Términos y Condiciones') : t('privacidad', 'title', 'Política de privacidad')}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-6" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
          {view === 'terms' ? t('terminos', 'content', '') : t('privacidad', 'content', '')}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5" style={{ background: '#000' }}>
      <div className="w-full max-w-sm">
        <div className="rounded-2xl p-6" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}>

          <div className="flex items-center justify-between mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Logoprincipal.svg" alt="Flashttoo" style={{ height: 22 }} />
            <a href="/" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 20, lineHeight: 1, textDecoration: 'none' }}>✕</a>
          </div>

          {view === 'register' && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-center mb-1" style={{ color: '#efff42', letterSpacing: '0.06em' }}>
                {t('ingresar', 'solo_estudios', 'Registro de estudios')}
              </p>
              <input
                type="email" placeholder={t('ingresar', 'email_placeholder', 'Tu email')} value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none' }} />
              <input
                type="password" placeholder={t('ingresar', 'password_placeholder', 'Contraseña (mín. 8 caracteres)')} value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRegister()}
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none' }} />
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={tyc} onChange={e => setTyc(e.target.checked)} className="mt-0.5 shrink-0" />
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                  {t('ingresar', 'tyc_prefix', 'Al registrarme acepto los')}{' '}
                  <button type="button" onClick={() => setView('terms')} style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'underline', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 'inherit' }}>{t('ingresar', 'tyc_terms', 'Términos y condiciones')}</button>
                  {' '}{t('ingresar', 'tyc_and', 'y la')}{' '}
                  <button type="button" onClick={() => setView('privacy')} style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'underline', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 'inherit' }}>{t('ingresar', 'tyc_privacy', 'Política de privacidad')}</button>
                  {' '}de Flashttoo.
                </span>
              </label>
              {error && <p className="text-xs" style={{ color: 'rgba(255,100,100,0.8)' }}>{error}</p>}
              <button onClick={handleRegister} disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ background: '#efff42', color: '#000' }}>
                {loading ? t('ingresar', 'creating_account', 'Creando cuenta...') : t('ingresar', 'continue_btn', 'Continuar')}
              </button>
              <a href="/" className="text-xs text-center block" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {t('ingresar', 'back_btn', 'Volver')}
              </a>
            </div>
          )}

          {view === 'registered' && (
            <div className="flex flex-col gap-4 text-center">
              <p className="text-sm font-bold text-white">{t('ingresar', 'registered_title', '¡Cuenta creada!')}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
                {t('ingresar', 'registered_msg', 'Te enviamos un mail a')} <span style={{ color: 'rgba(255,255,255,0.7)' }}>{email}</span>.<br />
                {t('ingresar', 'registered_studio_msg', 'Hacé click en el link del mail para completar el perfil de tu estudio.')}
              </p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)', lineHeight: 1.6 }}>
                {t('ingresar', 'registered_spam', 'Revisá también la carpeta de spam.')}
              </p>
              <a href="/"
                className="w-full py-3 rounded-xl text-sm font-bold text-center block"
                style={{ background: '#efff42', color: '#000' }}>
                {t('ingresar', 'understood_btn', 'Entendido')}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
