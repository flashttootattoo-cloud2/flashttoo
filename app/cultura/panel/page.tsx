'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

type Phrase = { id: string; image_url: string; description: string | null; language_code: string; tags: string[]; active: boolean; created_at: string }

const TAGS = ['tatuaje','técnica','cultura','arte','diseño','cuidados','minimalista','color','tradicional','blackwork','realismo','geometría','lettering','historia','inspiración','guía']
const iCls: React.CSSProperties = { width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#fff', fontSize: 13, outline: 'none' }

export default function CulturaPanel() {
  const [token, setToken] = useState<string | null>(null)
  const [editorName, setEditorName] = useState('')
  const [checking, setChecking] = useState(true)

  // login
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  // form
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [lang, setLang] = useState('es')
  const [tags, setTags] = useState<string[]>([])
  const [scheduled, setScheduled] = useState(false)
  const [publishAt, setPublishAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // recent phrases
  const [phrases, setPhrases] = useState<Phrase[]>([])
  const [loadingPhrases, setLoadingPhrases] = useState(false)

  const imgRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const saved = sessionStorage.getItem('cultura_token')
    if (!saved) { setChecking(false); return }
    fetch(`/api/cultura/auth?token=${saved}`)
      .then(r => r.json())
      .then(d => {
        if (d.valid) { setToken(saved); setEditorName(d.name) }
        else sessionStorage.removeItem('cultura_token')
      })
      .catch(() => {})
      .finally(() => setChecking(false))
  }, [])

  const loadPhrases = useCallback(async (t: string) => {
    setLoadingPhrases(true)
    const r = await fetch('/api/admin/phrases', { headers: { 'x-cultura-token': t } }).catch(() => null)
    if (r?.ok) {
      const d = await r.json()
      setPhrases((d.phrases || []).slice(0, 12))
    }
    setLoadingPhrases(false)
  }, [])

  useEffect(() => { if (token) loadPhrases(token) }, [token, loadPhrases])

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoggingIn(true)
    const r = await fetch('/api/cultura/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
    const d = await r.json()
    setLoggingIn(false)
    if (!r.ok) { setLoginError(d.error || 'Error'); return }
    sessionStorage.setItem('cultura_token', d.token)
    setToken(d.token)
    setEditorName(d.name)
  }

  const submit = async () => {
    if (!image || !token) return
    setSaving(true); setError(''); setSuccess(false)
    const fd = new FormData()
    fd.append('image', image)
    fd.append('description', description)
    fd.append('language_code', lang)
    fd.append('tags', tags.join(','))
    if (scheduled && publishAt) fd.append('publish_at', new Date(publishAt).toISOString())
    const r = await fetch('/api/phrases', { method: 'POST', headers: { 'x-cultura-token': token }, body: fd })
    const d = await r.json()
    setSaving(false)
    if (!r.ok) { setError(d.error || 'Error al publicar'); return }
    setSuccess(true)
    setImage(null); setPreview(null); setDescription(''); setTags([]); setScheduled(false); setPublishAt('')
    setPhrases(prev => [d.phrase, ...prev].slice(0, 12))
    setTimeout(() => setSuccess(false), 3000)
  }

  if (checking) return (
    <div style={{ minHeight: '100dvh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 24, height: 24, border: '2px solid rgba(239,255,66,0.3)', borderTop: '2px solid #efff42', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  if (!token) return (
    <div style={{ minHeight: '100dvh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(239,255,66,0.6)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Flashttoo</p>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Panel de Cultura</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 32 }}>Ingresá con tus credenciales para publicar contenido.</p>
        <form onSubmit={login} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email" required style={iCls} />
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Contraseña" required style={iCls} />
          {loginError && <p style={{ fontSize: 12, color: '#f87171' }}>{loginError}</p>}
          <button type="submit" disabled={loggingIn} style={{ padding: '12px', background: '#efff42', color: '#000', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: 'pointer', opacity: loggingIn ? 0.6 : 1 }}>
            {loggingIn ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: '#0a0a0a', padding: '24px 16px', maxWidth: 560, margin: '0 auto' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } } * { box-sizing: border-box }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(239,255,66,0.6)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>Flashttoo · Cultura</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Hola, {editorName}</p>
        </div>
        <button onClick={() => { sessionStorage.removeItem('cultura_token'); setToken(null) }}
          style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer' }}>
          Salir
        </button>
      </div>

      {/* Formulario */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 20, marginBottom: 28 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Nueva publicación</p>

        {/* Imagen */}
        <div onClick={() => imgRef.current?.click()}
          style={{ aspectRatio: '1', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)', overflow: 'hidden', cursor: 'pointer', marginBottom: 14, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {preview
            ? <img src={preview} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            : <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>+ Subir imagen</p>
          }
        </div>
        <input ref={imgRef} type="file" accept="image/*" hidden onChange={e => {
          const f = e.target.files?.[0]; if (!f) return
          setImage(f); setPreview(URL.createObjectURL(f))
        }} />

        {/* Descripción */}
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
          placeholder="Descripción (opcional)"
          style={{ ...iCls, resize: 'vertical', marginBottom: 14 }} />

        {/* Tags */}
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>Tags</p>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {TAGS.map(tag => {
              const on = tags.includes(tag)
              return (
                <button key={tag} type="button"
                  onClick={() => setTags(prev => on ? prev.filter(t => t !== tag) : [...prev, tag])}
                  style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, border: `1px solid ${on ? 'rgba(239,255,66,0.5)' : 'rgba(255,255,255,0.1)'}`, background: on ? 'rgba(239,255,66,0.12)' : 'transparent', color: on ? '#efff42' : 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>
                  #{tag}
                </button>
              )
            })}
          </div>
        </div>

        {/* Idioma */}
        <select value={lang} onChange={e => setLang(e.target.value)} style={{ ...iCls, marginBottom: 14 }}>
          <option value="es">Español</option>
          <option value="en">English</option>
          <option value="pt">Português</option>
        </select>

        {/* Programar */}
        <div style={{ marginBottom: 14 }}>
          <button type="button" onClick={() => setScheduled(v => !v)}
            style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', background: scheduled ? 'rgba(239,255,66,0.12)' : 'rgba(255,255,255,0.06)', border: `1px solid ${scheduled ? 'rgba(239,255,66,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 8, color: scheduled ? '#efff42' : 'rgba(255,255,255,0.45)', cursor: 'pointer' }}>
            🕐 Programar publicación
          </button>
          {scheduled && (
            <input type="datetime-local" value={publishAt} onChange={e => setPublishAt(e.target.value)}
              style={{ ...iCls, marginTop: 8, colorScheme: 'dark' as React.CSSProperties['colorScheme'] }} />
          )}
        </div>

        {error && <p style={{ fontSize: 12, color: '#f87171', marginBottom: 10 }}>{error}</p>}
        {success && <p style={{ fontSize: 12, color: '#4ade80', marginBottom: 10 }}>¡Publicado correctamente!</p>}

        <button onClick={submit} disabled={saving || !image}
          style={{ width: '100%', padding: '13px', background: !image ? 'rgba(255,255,255,0.08)' : '#efff42', color: !image ? 'rgba(255,255,255,0.3)' : '#000', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: image ? 'pointer' : 'default', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Publicando…' : 'Publicar'}
        </button>
      </div>

      {/* Publicaciones recientes */}
      <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Publicaciones recientes</p>
      {loadingPhrases ? (
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Cargando...</p>
      ) : phrases.length === 0 ? (
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Sin publicaciones aún</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {phrases.map(p => (
            <div key={p.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,0.04)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {!p.active && <div style={{ position: 'absolute', top: 4, right: 4, fontSize: 8, background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,66,0.8)', borderRadius: 4, padding: '2px 5px', fontWeight: 700 }}>PENDIENTE</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
