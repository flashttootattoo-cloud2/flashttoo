'use client'

import { useState } from 'react'
import { useTranslation } from '@/contexts/TranslationContext'

type View = 'menu' | 'login' | 'register' | 'registered' | 'forgot' | 'forgot_sent' | 'terms' | 'privacy'

type Props = {
  onClose: () => void
  onLoggedIn: (artist: { id: string; name: string; photo_url: string; edit_key: string; auth_email?: string | null; access_token?: string }) => void
}

export default function ArtistAuthModal({ onClose, onLoggedIn }: Props) {
  const { t } = useTranslation()
  const [view, setView] = useState<View>('menu')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [tyc, setTyc] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const reset = () => { setError(''); setLoading(false) }

  const handleRegister = async () => {
    if (!tyc) { setError(t('ingresar', 'error_tyc', 'Tenés que aceptar los términos para continuar')); return }
    if (!email || !password) { setError(t('ingresar', 'error_fields', 'Completá email y contraseña')); return }
    if (password.length < 8) { setError(t('ingresar', 'error_password_short', 'La contraseña debe tener al menos 8 caracteres')); return }
    setLoading(true); setError('')
    const r = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const d = await r.json()
    setLoading(false)
    if (!r.ok) { setError(d.error); return }
    setView('registered')
  }

  const handleLogin = async () => {
    if (!email || !password) { setError(t('ingresar', 'error_fields', 'Completá email y contraseña')); return }
    setLoading(true); setError('')
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const d = await r.json()
    setLoading(false)
    if (!r.ok) { setError(d.error); return }
    onLoggedIn({ ...d.artist, access_token: d.access_token })
  }

  const handleForgot = async () => {
    if (!email) { setError(t('ingresar', 'error_email_required', 'Ingresá tu email')); return }
    setLoading(true); setError('')
    await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setLoading(false)
    setView('forgot_sent')
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center px-5"
      style={{ zIndex: 80, background: 'rgba(0,0,0,0.8)' }}
      onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Logoprincipal.svg" alt="Flashttoo" style={{ height: 22 }} />
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.3)', fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>

        {/* MENU */}
        {view === 'menu' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-center mb-1" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' }}>{t('ingresar', 'solo_tatuadores', 'Solo para tatuadores')}</p>
            <button onClick={() => { reset(); setView('register') }}
              className="w-full py-3 rounded-xl text-sm font-bold"
              style={{ background: '#efff42', color: '#000' }}>
              {t('ingresar', 'register_btn', 'Registrar mi perfil')}
            </button>
            <button onClick={() => { reset(); setView('login') }}
              className="w-full py-3 rounded-xl text-sm font-bold"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {t('ingresar', 'edit_btn', 'Editar mi perfil')}
            </button>
          </div>
        )}

        {/* REGISTER */}
        {view === 'register' && (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-bold text-white mb-1">{t('ingresar', 'register_title', 'Crear cuenta')}</p>
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
              <input type="checkbox" checked={tyc} onChange={e => setTyc(e.target.checked)}
                className="mt-0.5 shrink-0" />
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
            <button onClick={() => { reset(); setView('menu') }}
              className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {t('ingresar', 'back_btn', 'Volver')}
            </button>
          </div>
        )}

        {/* LOGIN */}
        {view === 'login' && (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-bold text-white mb-1">{t('ingresar', 'login_title', 'Editar mi perfil')}</p>
            <input
              type="email" placeholder={t('ingresar', 'email_placeholder', 'Tu email')} value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none' }} />
            <input
              type="password" placeholder={t('ingresar', 'password_login_placeholder', 'Contraseña')} value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none' }} />
            {error && <p className="text-xs" style={{ color: 'rgba(255,100,100,0.8)' }}>{error}</p>}
            <button onClick={handleLogin} disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50"
              style={{ background: '#efff42', color: '#000' }}>
              {loading ? t('ingresar', 'logging_in', 'Ingresando...') : t('ingresar', 'login_btn', 'Ingresar')}
            </button>
            <button onClick={() => { reset(); setView('forgot') }}
              className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {t('ingresar', 'forgot_link', 'Olvidé mi contraseña')}
            </button>
            <button onClick={() => { reset(); setView('menu') }}
              className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.2)' }}>
              {t('ingresar', 'back_btn', 'Volver')}
            </button>
          </div>
        )}

        {/* REGISTERED */}
        {view === 'registered' && (
          <div className="flex flex-col gap-4 text-center">
            <p className="text-sm font-bold text-white">{t('ingresar', 'registered_title', '¡Cuenta creada!')}</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
              {t('ingresar', 'registered_msg', 'Te enviamos un mail a')} <span style={{ color: 'rgba(255,255,255,0.7)' }}>{email}</span>.<br />
              {t('ingresar', 'registered_msg2', 'Hacé click en el link del mail para completar tu perfil.')}
            </p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)', lineHeight: 1.6 }}>
              {t('ingresar', 'registered_spam', 'Revisá también la carpeta de spam.')}
            </p>
            <button onClick={onClose}
              className="w-full py-3 rounded-xl text-sm font-bold"
              style={{ background: '#efff42', color: '#000' }}>
              {t('ingresar', 'understood_btn', 'Entendido')}
            </button>
          </div>
        )}

        {/* FORGOT */}
        {view === 'forgot' && (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-bold text-white mb-1">{t('ingresar', 'forgot_title', 'Recuperar contraseña')}</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
              {t('ingresar', 'forgot_desc', 'Te mandamos un link a tu mail para crear una nueva contraseña.')}
            </p>
            <input
              type="email" placeholder={t('ingresar', 'email_placeholder', 'Tu email')} value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleForgot()}
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none' }} />
            {error && <p className="text-xs" style={{ color: 'rgba(255,100,100,0.8)' }}>{error}</p>}
            <button onClick={handleForgot} disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50"
              style={{ background: '#efff42', color: '#000' }}>
              {loading ? t('ingresar', 'sending', 'Enviando...') : t('ingresar', 'send_link_btn', 'Enviar link')}
            </button>
            <button onClick={() => { reset(); setView('login') }}
              className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {t('ingresar', 'back_btn', 'Volver')}
            </button>
          </div>
        )}

        {/* FORGOT SENT */}
        {view === 'forgot_sent' && (
          <div className="flex flex-col gap-4 text-center">
            <p className="text-sm font-bold text-white">{t('ingresar', 'forgot_sent_title', 'Mail enviado')}</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
              {t('ingresar', 'forgot_sent_desc', 'Revisá tu casilla y seguí el link para crear una nueva contraseña.')}
            </p>
            <button onClick={onClose}
              className="w-full py-3 rounded-xl text-sm font-bold"
              style={{ background: '#efff42', color: '#000' }}>
              {t('ingresar', 'close_btn', 'Cerrar')}
            </button>
          </div>
        )}

      </div>
    </div>

    {/* TERMS / PRIVACY — fullscreen overlay */}
    {(view === 'terms' || view === 'privacy') && (
      <div className="fixed inset-0 flex flex-col" style={{ zIndex: 200, background: '#000' }}>
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
    )}
  )
}
