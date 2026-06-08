'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { INTERVIEW_QUESTIONS } from '@/lib/interview'

const DEFAULT_STYLES = [
  'Tradicional','Realismo','Blackwork','Acuarela','Geométrico',
  'Japonés','Neo Tradicional','Minimalista','Old School','Dotwork',
  'Fineline','Lettering','Tribal','Biomecánico','Cover-up','Ornamental','Otros',
]

function genKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function AgregarPage() {
  const [form, setForm] = useState({
    name: '', city: '', country: '', instagram: '', whatsapp: '', email: '', bio: '',
  })
  const BIO_MAX = 280
  const [editKey, setEditKey]   = useState(() => genKey())
  const [keyCopied, setKeyCopied] = useState(false)
  const [allStyles, setAllStyles]   = useState<string[]>(DEFAULT_STYLES)
  const [styles, setStyles]         = useState<string[]>([])
  const [stylesOpen, setStylesOpen] = useState(false)
  const stylesRef = useRef<HTMLDivElement>(null)
  const [igStatus, setIgStatus]     = useState<'idle'|'checking'|'ok'|'taken'>('idle')
  const igTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const handle = form.instagram.trim().replace('@', '')
    if (!handle) { setIgStatus('idle'); return }
    setIgStatus('checking')
    clearTimeout(igTimer.current)
    igTimer.current = setTimeout(async () => {
      const { data } = await supabase
        .from('artists')
        .select('id')
        .or(`instagram.ilike.${handle},instagram.ilike.@${handle}`)
        .limit(1)
      setIgStatus(data && data.length > 0 ? 'taken' : 'ok')
    }, 600)
    return () => clearTimeout(igTimer.current)
  }, [form.instagram])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (stylesRef.current && !stylesRef.current.contains(e.target as Node)) setStylesOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  const [moderation, setModeration] = useState(false)
  const [photo, setPhoto]       = useState<File | null>(null)
  const [preview, setPreview]   = useState<string | null>(null)
  const [interview, setInterview] = useState<Record<string, string>>({})
  const [interviewOpen, setInterviewOpen] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState<false | 'active' | 'pending'>(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(d => setModeration(!!d.moderation)).catch(() => {})
    fetch('/api/styles').then(r => r.json()).then(d => { if (d.styles?.length) setAllStyles(d.styles) }).catch(() => {})
  }, [])

  const toggleStyle = (s: string) =>
    setStyles(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))

    const img = new window.Image()
    img.onload = () => {
      const MAX = 900
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX }
        else { width = Math.round(width * MAX / height); height = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        blob => { if (blob) setPhoto(new File([blob], 'photo.webp', { type: 'image/webp' })) },
        'image/webp', 0.82
      )
    }
    img.src = URL.createObjectURL(file)
  }

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    setError('')
    if (!photo) { setError('Agregá una foto'); return }
    if (styles.length === 0) { setError('Elegí al menos un estilo'); return }

    setLoading(true)
    try {
      // Subir foto
      const ext  = photo.name.split('.').pop()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('artist-photos')
        .upload(path, photo, { contentType: photo.type })
      if (upErr) {
        setError(`Error al subir foto: ${upErr.message}`)
        setLoading(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('artist-photos')
        .getPublicUrl(path)

      if (igStatus === 'taken') { setLoading(false); return }

      // Insertar artista
      const { error: insErr } = await supabase.from('artists').insert({
        name:      form.name.trim(),
        city:      form.city.trim(),
        country:   form.country.trim(),
        styles,
        photo_url: urlData.publicUrl,
        instagram: form.instagram.trim() || null,
        whatsapp:  form.whatsapp.trim()  || null,
        email:     form.email.trim()     || null,
        bio:       form.bio.trim()       || null,
        edit_key:  editKey.trim().toUpperCase(),
        status:    moderation ? 'pending' : 'active',
        interview: Object.fromEntries(Object.entries(interview).filter(([, v]) => v.trim())),
      })
      if (insErr) {
        setError(`Error al guardar: ${insErr.message}`)
        setLoading(false)
        return
      }

      setDone(moderation ? 'pending' : 'active')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err)
      setError(`Error inesperado: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  if (done === 'pending') return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <h2 className="text-xl font-bold mb-2">Perfil en revisión</h2>
        <p className="text-white/50 text-sm mb-2">Tu perfil fue enviado y está esperando aprobación.</p>
        <p className="text-white/30 text-sm mb-6">Vas a aparecer en el buscador una vez que sea aprobado.</p>
        <Link href="/" className="text-sm text-[#efff42] underline underline-offset-4">Volver al inicio</Link>
      </div>
    </main>
  )

  if (done === 'active') return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <h2 className="text-xl font-bold mb-2">Listo.</h2>
        <p className="text-white/50 text-sm mb-6">Tu perfil ya está en el buscador.</p>
        <Link href="/" className="text-sm text-[#efff42] underline underline-offset-4">Ver buscador</Link>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-xs text-white/30 hover:text-white/60 transition-colors">← volver</Link>
          <h1 className="text-xl font-bold mt-3">Agregar tatuador</h1>
          <p className="text-sm text-white/40 mt-1">Completá tu perfil para aparecer en el buscador.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* Foto */}
          <div>
            <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">Foto *</label>
            <label className="relative cursor-pointer block">
              {preview ? (
                <div className="relative w-full aspect-square rounded-xl overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-xs text-white">cambiar foto</span>
                  </div>
                </div>
              ) : (
                <div className="w-full aspect-square rounded-xl border-2 border-dashed border-white/10 hover:border-white/20 flex flex-col items-center justify-center gap-2 transition-colors">
                  <span className="text-xs text-white/30">subir foto</span>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
            </label>
          </div>

          {/* Nombre */}
          <Field label="Nombre / Apodo *">
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Tu nombre o nombre del estudio" className={inputCls} />
          </Field>

          {/* Ciudad / País */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ciudad *">
              <input required value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                placeholder="Buenos Aires" className={inputCls} />
            </Field>
            <Field label="País *">
              <input required value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                placeholder="Argentina" className={inputCls} />
            </Field>
          </div>

          {/* Estilos — dropdown */}
          <div ref={stylesRef} className="relative">
            <label className="text-xs text-white/40 uppercase tracking-widest block mb-1.5">Estilos *</label>

            {/* Trigger */}
            <button type="button" onClick={() => setStylesOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${stylesOpen ? 'rgba(239,255,66,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
              <span style={{ color: styles.length ? '#fff' : 'rgba(255,255,255,0.2)' }}>
                {styles.length === 0 ? 'Seleccioná estilos...' : styles.join(', ')}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{stylesOpen ? '▲' : '▼'}</span>
            </button>

            {/* Panel desplegable */}
            {stylesOpen && (
              <div className="rounded-xl mt-1 overflow-y-auto"
                style={{
                  background: '#141414',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.7)',
                  maxHeight: 280,
                }}>
                <div className="grid grid-cols-2">
                  {allStyles.map((s: string) => {
                    const on = styles.includes(s)
                    return (
                      <button key={s} type="button" onClick={() => toggleStyle(s)}
                        className="flex items-center justify-between px-4 py-3 text-sm transition-all"
                        style={{
                          background: on ? 'rgba(239,255,66,0.1)' : 'transparent',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          borderRight: '1px solid rgba(255,255,255,0.04)',
                        }}
                        onMouseEnter={e => { if (!on) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                        onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent' }}>
                        <span style={{ color: on ? '#efff42' : 'rgba(255,255,255,0.55)', fontWeight: on ? 700 : 400 }}>{s}</span>
                        <span style={{ color: '#efff42', fontSize: 14, opacity: on ? 1 : 0 }}>✓</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Tags seleccionados */}
            {styles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {styles.map(s => (
                  <span key={s} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(239,255,66,0.08)', border: '1px solid rgba(239,255,66,0.2)', color: '#efff42' }}>
                    {s}
                    <button type="button" onClick={() => toggleStyle(s)}
                      style={{ color: 'rgba(239,255,66,0.5)', lineHeight: 1 }}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Contacto */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-white/40 uppercase tracking-widest">Instagram</label>
              {igStatus === 'checking' && <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>verificando...</span>}
              {igStatus === 'ok'       && <span className="text-xs font-bold" style={{ color: '#4ade80' }}>✓ disponible</span>}
              {igStatus === 'taken'    && <span className="text-xs font-bold" style={{ color: '#f87171' }}>✗ ya registrado</span>}
            </div>
            <input
              value={form.instagram}
              onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))}
              placeholder="@usuario"
              className={inputCls}
              style={{ borderColor: igStatus === 'taken' ? 'rgba(248,113,113,0.5)' : igStatus === 'ok' ? 'rgba(74,222,128,0.4)' : undefined }}
            />
          </div>
          <Field label="WhatsApp">
            <input value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
              placeholder="+54 9 11 1234 5678" className={inputCls} />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="hola@ejemplo.com" className={inputCls} />
          </Field>

          {/* Bio con contador */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-white/40 uppercase tracking-widest">Biografía</label>
              <span className="text-xs tabular-nums"
                style={{ color: form.bio.length >= BIO_MAX ? '#f87171' : form.bio.length >= BIO_MAX * 0.85 ? '#fbbf24' : 'rgba(255,255,255,0.2)' }}>
                {form.bio.length}/{BIO_MAX}
              </span>
            </div>
            <textarea
              value={form.bio}
              onChange={e => { if (e.target.value.length <= BIO_MAX) setForm(f => ({ ...f, bio: e.target.value })) }}
              placeholder="Contá algo sobre vos, tu estilo, tu trabajo..."
              rows={3}
              className={inputCls}
              style={{ resize: 'none', lineHeight: 1.6 }}
            />
          </div>

          {/* Entrevista opcional */}
          <div>
            <button
              type="button"
              onClick={() => setInterviewOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all"
              style={{
                background: interviewOpen ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>Tu historia — opcional</span>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>{interviewOpen ? '▲' : '▼'}</span>
            </button>

            {interviewOpen && (
              <div className="mt-4">
                <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.2)', lineHeight: 1.6 }}>
                  Respondé las que quieras. Aparecen en tu perfil para que los clientes te conozcan mejor.
                </p>
                <div className="flex flex-col gap-4">
                  {INTERVIEW_QUESTIONS.map(q => (
                    <div key={q.key}>
                      <p className="text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{q.label}</p>
                      <textarea
                        value={interview[q.key] || ''}
                        onChange={e => {
                          if (e.target.value.length <= 300)
                            setInterview(prev => ({ ...prev, [q.key]: e.target.value }))
                        }}
                        rows={2}
                        placeholder="Respuesta opcional..."
                        className={inputCls}
                        style={{ resize: 'none', lineHeight: 1.6 }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          {/* Clave de edición */}
          <div style={{ background: 'rgba(239,255,66,0.05)', border: '1px solid rgba(239,255,66,0.2)', borderRadius: 12, padding: '16px' }}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-widest" style={{ color: '#efff42' }}>
                Clave de edición
              </label>
              <button type="button"
                onClick={() => setEditKey(genKey())}
                className="text-xs transition-opacity hover:opacity-70"
                style={{ color: 'rgba(239,255,66,0.5)' }}>
                generar nueva
              </button>
            </div>
            <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
              Con esta clave podés editar tu perfil después. Guardala — no se puede recuperar.
            </p>
            <div className="flex gap-2">
              <input
                value={editKey}
                onChange={e => setEditKey(e.target.value.toUpperCase().slice(0, 12))}
                className="flex-1 py-2.5 px-4 text-center font-bold text-lg tracking-widest rounded-lg outline-none"
                style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(239,255,66,0.3)', color: '#efff42', letterSpacing: '0.2em' }}
              />
              <button type="button"
                onClick={() => { navigator.clipboard.writeText(editKey); setKeyCopied(true); setTimeout(() => setKeyCopied(false), 2000) }}
                className="px-4 rounded-lg text-xs font-bold transition-all"
                style={{ background: keyCopied ? 'rgba(74,222,128,0.15)' : 'rgba(239,255,66,0.1)', border: `1px solid ${keyCopied ? 'rgba(74,222,128,0.4)' : 'rgba(239,255,66,0.3)'}`, color: keyCopied ? '#4ade80' : '#efff42' }}>
                {keyCopied ? '✓' : 'copiar'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || igStatus === 'taken'}
            className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
            style={{ background: '#efff42', color: '#000' }}
          >
            {loading ? 'Subiendo...' : 'Agregar al buscador'}
          </button>

          <p className="text-center" style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', lineHeight: 1.6 }}>
            Al registrarte aceptás nuestros{' '}
            <Link href="/terminos" className="underline hover:opacity-80" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Términos y condiciones
            </Link>{' '}
            y{' '}
            <Link href="/privacidad" className="underline hover:opacity-80" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Política de privacidad
            </Link>
          </p>
        </form>
      </div>
    </main>
  )
}

const inputCls = 'w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-white/30 transition-colors'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-white/40 uppercase tracking-widest block mb-1.5">{label}</label>
      {children}
    </div>
  )
}
