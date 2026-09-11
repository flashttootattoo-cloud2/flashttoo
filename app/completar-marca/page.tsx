'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { useTranslation } from '@/contexts/TranslationContext'

function nameFromEmail(email: string) {
  return email.split('@')[0].replace(/[._\-+]/g, ' ').replace(/\s+/g, ' ').trim() || 'Mi Marca'
}

function CompletarMarcaForm() {
  const params = useSearchParams()
  const userId = params.get('user_id') || ''
  const email = params.get('email') || ''
  const { t, language, setLanguage, languages } = useTranslation()

  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuLangOpen, setMenuLangOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false); setMenuLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!userId || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#000' }}>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>{t('completar_marca', 'invalid_link', 'Link inválido.')}</p>
      </div>
    )
  }

  const handleConfirm = async () => {
    if (!password) { setError(t('completar_marca', 'error_password_empty', 'Ingresá tu contraseña')); return }
    setLoading(true); setError('')

    const r = await fetch('/api/sponsors-v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, email, name: nameFromEmail(email) }),
    })
    const d = await r.json()

    if (!r.ok && r.status !== 409) {
      setError(d.error || t('completar_marca', 'error_create', 'Error al crear la marca'))
      setLoading(false)
      return
    }

    const slug: string = r.status === 409 ? d.slug : d.sponsor?.slug

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: auth, error: authError } = await sb.auth.signInWithPassword({ email, password })
    if (authError || !auth.session) {
      setError(t('completar_marca', 'error_wrong_password', 'Contraseña incorrecta'))
      setLoading(false)
      return
    }

    sessionStorage.setItem('flashttoo_sponsor_auth', JSON.stringify({
      slug,
      name: nameFromEmail(email),
      access_token: auth.session.access_token,
      refresh_token: auth.session.refresh_token,
    }))

    window.location.href = `/?marca=${slug}`
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#000' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Logoprincipal.svg" alt="Flashttoo" style={{ height: 24 }} />
        <div ref={menuRef} className="relative">
          <button
            onClick={() => { setMenuOpen(v => !v); setMenuLangOpen(false) }}
            className="flex items-center justify-center rounded-lg"
            style={{ width: 32, height: 36, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 16 }}>
            ⋮
          </button>
          {menuOpen && languages.length > 1 && (
            <div className="absolute right-0 mt-1 rounded-xl z-50"
              style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 16px 40px rgba(0,0,0,0.8)', minWidth: 180, overflow: 'hidden' }}>
              <button
                onClick={() => setMenuLangOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm text-left"
                style={{ color: 'rgba(255,255,255,0.8)' }}>
                <span>{t('inicio', 'menu_language', 'Idioma')}</span>
                <span style={{ fontSize: 9, opacity: 0.45 }}>{menuLangOpen ? '▲' : '▼'}</span>
              </button>
              {menuLangOpen && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  {languages.map(l => (
                    <button key={l.code}
                      onClick={() => { setLanguage(l.code); setMenuOpen(false); setMenuLangOpen(false) }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left"
                      style={{
                        background: l.code === language ? 'rgba(239,255,66,0.08)' : 'transparent',
                        color: l.code === language ? '#efff42' : 'rgba(255,255,255,0.7)',
                        fontWeight: l.code === language ? 700 : 400,
                      }}>
                      <span>{l.flag}</span>
                      <span>{l.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 flex items-center justify-center px-5 py-8">
        <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-sm font-bold text-white mb-2">{t('completar_marca', 'title', 'Bienvenido a Flashttoo')}</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, marginBottom: 20 }}>
            {t('completar_marca', 'subtitle', 'Tu cuenta fue creada con éxito. Ingresá con tu contraseña para confirmar el registro de tu marca.')}
          </p>

          <div style={{ background: 'rgba(239,255,66,0.08)', border: '1px solid rgba(239,255,66,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
            <p style={{ fontSize: 10, color: 'rgba(239,255,66,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{t('completar_marca', 'registered_with', 'Cuenta registrada con')}</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', wordBreak: 'break-all' }}>{email}</p>
          </div>

          <div className="flex flex-col gap-3">
            <input
              type="password"
              placeholder={t('completar_marca', 'password_placeholder', 'Contraseña')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConfirm()}
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none' }}
              autoFocus
            />
            {error && <p className="text-xs" style={{ color: 'rgba(255,100,100,0.8)' }}>{error}</p>}
            <button onClick={handleConfirm} disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50"
              style={{ background: '#efff42', color: '#000' }}>
              {loading ? t('completar_marca', 'btn_loading', 'Confirmando...') : t('completar_marca', 'btn_confirm', 'Confirmar')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CompletarMarcaPage() {
  return (
    <Suspense>
      <CompletarMarcaForm />
    </Suspense>
  )
}
