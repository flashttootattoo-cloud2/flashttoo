'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslation } from '@/contexts/TranslationContext'

function CompletarEstudioForm() {
  const { t } = useTranslation()
  const params = useSearchParams()
  const userId = params.get('user_id') || ''
  const email = params.get('email') || ''

  const [form, setForm] = useState({ name: '', city: '', country: '', instagram: '', whatsapp: '', website: '', description: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [existingSlug, setExistingSlug] = useState('')

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    if (!form.name.trim()) { setError('El nombre del estudio es requerido'); return }
    setLoading(true); setError('')
    const r = await fetch('/api/studios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, email, ...form }),
    })
    const d = await r.json()
    setLoading(false)
    if (r.status === 409) { setExistingSlug(d.slug || ''); setDone(true); return }
    if (!r.ok) { setError(d.error || 'Error al guardar'); return }
    setDone(true)
  }

  if (!userId || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#000' }}>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Link inválido.</p>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5" style={{ background: '#000' }}>
        <div className="w-full max-w-sm rounded-2xl p-6 text-center flex flex-col gap-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Logoprincipal.svg" alt="Flashttoo" style={{ height: 22, margin: '0 auto 8px' }} />
          <p className="text-sm font-bold text-white">
            {existingSlug ? 'Tu estudio ya estaba creado.' : '¡Estudio creado!'}
          </p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
            {existingSlug
              ? 'Ya completaste el perfil de tu estudio. Ingresá desde el botón "Ingresar" en la app.'
              : 'Tu estudio fue enviado para revisión. Estará visible una vez que sea activado por el equipo de Flashttoo. Podés ingresar desde el botón "Ingresar" en la app.'}
          </p>
          <a href="/"
            className="w-full py-3 rounded-xl text-sm font-bold text-center block"
            style={{ background: '#efff42', color: '#000' }}>
            Ir a Flashttoo
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-10" style={{ background: '#000' }}>
      <div className="w-full max-w-sm">
        <div className="rounded-2xl p-6" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Logoprincipal.svg" alt="Flashttoo" style={{ height: 22, marginBottom: 20 }} />

          <div style={{ background: 'rgba(239,255,66,0.08)', border: '1px solid rgba(239,255,66,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
            <p style={{ fontSize: 10, color: 'rgba(239,255,66,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Cuenta</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', wordBreak: 'break-all' }}>{email}</p>
          </div>

          <p className="text-sm font-bold text-white mb-4">Perfil del estudio</p>

          <div className="flex flex-col gap-3">
            {([
              { key: 'name', label: 'Nombre del estudio *', placeholder: 'Nombre', type: 'input' },
              { key: 'city', label: 'Ciudad', placeholder: 'Buenos Aires', type: 'input' },
              { key: 'country', label: 'País', placeholder: 'Argentina', type: 'input' },
              { key: 'instagram', label: 'Instagram', placeholder: '@tuestudio', type: 'input' },
              { key: 'whatsapp', label: 'WhatsApp', placeholder: '+54 9 11 1234 5678', type: 'input' },
              { key: 'website', label: 'Web', placeholder: 'https://tuestudio.com', type: 'input' },
              { key: 'description', label: 'Descripción', placeholder: 'Breve descripción del estudio...', type: 'textarea' },
            ] as const).map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</p>
                {type === 'textarea' ? (
                  <textarea value={form[key]} onChange={set(key)} placeholder={placeholder} rows={3}
                    className="w-full px-4 py-3 rounded-xl text-sm"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                ) : (
                  <input value={form[key]} onChange={set(key)} placeholder={placeholder}
                    className="w-full px-4 py-3 rounded-xl text-sm"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none' }} />
                )}
              </div>
            ))}

            {error && <p className="text-xs" style={{ color: 'rgba(255,100,100,0.8)' }}>{error}</p>}

            <button onClick={handleSave} disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50 mt-1"
              style={{ background: '#efff42', color: '#000' }}>
              {loading ? t('estudio', 'saving', 'Guardando...') : 'Crear estudio'}
            </button>
          </div>
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
