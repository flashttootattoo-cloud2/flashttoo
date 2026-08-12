'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

function nameFromEmail(email: string) {
  return email.split('@')[0].replace(/[._\-+]/g, ' ').replace(/\s+/g, ' ').trim() || 'Mi Estudio'
}

function CompletarEstudioForm() {
  const params = useSearchParams()
  const userId = params.get('user_id') || ''
  const email = params.get('email') || ''

  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!userId || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#000' }}>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Link inválido.</p>
      </div>
    )
  }

  const handleEdit = async () => {
    if (!password) { setError('Ingresá tu contraseña'); return }
    setLoading(true); setError('')

    // Crear estudio vacío (nombre desde email, resto vacío)
    const r = await fetch('/api/studios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, email, name: nameFromEmail(email) }),
    })
    const d = await r.json()

    if (!r.ok && r.status !== 409) {
      setError(d.error || 'Error al crear el estudio')
      setLoading(false)
      return
    }

    const slug: string = r.status === 409 ? d.slug : d.studio?.slug

    // Login con Supabase para obtener el access_token
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: auth, error: authError } = await sb.auth.signInWithPassword({ email, password })
    if (authError || !auth.session) {
      setError('Contraseña incorrecta')
      setLoading(false)
      return
    }

    // Guardar auth en sessionStorage y redirigir al editor
    sessionStorage.setItem('flashttoo_studio_auth', JSON.stringify({
      slug,
      auth_email: email,
      access_token: auth.session.access_token,
    }))

    window.location.href = `/?estudio=${slug}`
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5" style={{ background: '#000' }}>
      <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Logoprincipal.svg" alt="Flashttoo" style={{ height: 22, marginBottom: 24 }} />

        <p className="text-sm font-bold text-white mb-2">Bienvenido a Flashttoo</p>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, marginBottom: 20 }}>
          Tu cuenta fue creada con éxito. Ingresá con tu contraseña para abrir el editor de tu estudio.
        </p>

        <div style={{ background: 'rgba(239,255,66,0.08)', border: '1px solid rgba(239,255,66,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
          <p style={{ fontSize: 10, color: 'rgba(239,255,66,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Cuenta registrada con</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', wordBreak: 'break-all' }}>{email}</p>
        </div>

        <div className="flex flex-col gap-3">
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleEdit()}
            className="w-full px-4 py-3 rounded-xl text-sm"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none' }}
            autoFocus
          />
          {error && <p className="text-xs" style={{ color: 'rgba(255,100,100,0.8)' }}>{error}</p>}
          <button onClick={handleEdit} disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50"
            style={{ background: '#efff42', color: '#000' }}>
            {loading ? 'Entrando...' : 'Editar mi perfil'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CompletarEstudioPage() {
  return (
    <Suspense>
      <CompletarEstudioForm />
    </Suspense>
  )
}
