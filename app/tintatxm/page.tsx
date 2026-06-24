'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type DayVisit = { date: string; count: number }

type Artist = {
  id: string; name: string; city: string; country: string
  photo_url: string; instagram: string | null; whatsapp: string | null
  profile_views: number; instagram_clicks: number; whatsapp_clicks: number; likes: number
  edit_key: string; visible: boolean; created_at: string; status: string
}

function fmtN(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.0', '') + 'k'
  return String(n)
}

type Ad = {
  id: string; title: string; image_url: string; link: string
  city: string | null; clicks: number; active: boolean; created_at: string
}

type ContentCard = {
  id: string; title: string; body: string; active: boolean
}

const H = (pass: string) => ({ 'x-admin-pass': pass })

function SuggestInput({ value, onChange, suggestions, className, style, placeholder, required }: {
  value: string
  onChange: (v: string) => void
  suggestions: string[]
  className?: string
  style?: React.CSSProperties
  placeholder?: string
  required?: boolean
}) {
  const [open, setOpen] = useState(false)
  const query = value.trim().toLowerCase()
  const matches = open && query.length > 0
    ? suggestions.filter(s => s.toLowerCase().includes(query) && s.toLowerCase() !== query).slice(0, 6)
    : []

  return (
    <div className="relative">
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={className}
        style={style}
        placeholder={placeholder}
        required={required}
      />
      {matches.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 rounded-xl overflow-hidden z-20"
          style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 8px 24px rgba(0,0,0,0.7)' }}>
          {matches.map(s => (
            <button key={s} type="button"
              onMouseDown={() => { onChange(s); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm transition-colors"
              style={{ color: 'rgba(255,255,255,0.65)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,255,66,0.07)'; e.currentTarget.style.color = '#efff42' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)' }}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const DEFAULT_STYLES = [
  'Tradicional','Realismo','Blackwork','Acuarela','Geométrico',
  'Japonés','Neo Tradicional','Minimalista','Old School','Dotwork',
  'Fineline','Lettering','Tribal','Biomecánico','Cover-up','Ornamental','Otros',
]

function AddArtistForm({ pass, onAdded, availableStyles, existingArtists }: { pass: string; onAdded: (a: Artist) => void; availableStyles: string[]; existingArtists: Artist[] }) {
  const [form, setForm] = useState({ name: '', city: '', country: '', instagram: '', whatsapp: '', email: '', bio: '' })
  const [styles, setStyles]     = useState<string[]>([])
  const [stylesOpen, setStylesOpen] = useState(false)
  const [photo, setPhoto]       = useState<File | null>(null)
  const [preview, setPreview]   = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [done, setDone]         = useState<{ name: string; editKey: string } | null>(null)
  const [keyCopied, setKeyCopied] = useState(false)
  const [igStatus, setIgStatus] = useState<'idle'|'checking'|'ok'|'taken'>('idle')
  const igTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const BIO_MAX = 280

  const unique = (arr: string[]) => [...new Set(arr.filter(Boolean))]
  const citySuggestions  = unique(existingArtists.map(a => a.city))
  const countrySuggestions = unique(existingArtists.map(a => a.country))

  useEffect(() => {
    const handle = form.instagram.trim().replace('@', '')
    if (!handle) { setIgStatus('idle'); return }
    setIgStatus('checking')
    clearTimeout(igTimer.current)
    igTimer.current = setTimeout(async () => {
      const { data } = await supabase.from('artists').select('id')
        .or(`instagram.ilike.${handle},instagram.ilike.@${handle}`).limit(1)
      setIgStatus(data && data.length > 0 ? 'taken' : 'ok')
    }, 600)
    return () => clearTimeout(igTimer.current)
  }, [form.instagram])

  const toggleStyle = (s: string) =>
    setStyles(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setPreview(URL.createObjectURL(file))
    const img = new window.Image()
    img.onload = () => {
      const MAX = 900; let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX }
        else { width = Math.round(width * MAX / height); height = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(blob => { if (blob) setPhoto(new File([blob], 'photo.webp', { type: 'image/webp' })) }, 'image/webp', 0.82)
    }
    img.src = URL.createObjectURL(file)
  }

  const save = async (e: { preventDefault: () => void }) => {
    e.preventDefault(); setError('')
    if (!photo) { setError('Agregá una foto'); return }
    if (!form.name.trim() || !form.city.trim() || !form.country.trim()) { setError('Nombre, ciudad y país son obligatorios'); return }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('photo', photo)
      fd.append('name', form.name.trim())
      fd.append('city', form.city.trim())
      fd.append('country', form.country.trim())
      fd.append('styles', JSON.stringify(styles))
      fd.append('instagram', form.instagram.trim())
      fd.append('whatsapp', form.whatsapp.trim())
      fd.append('email', form.email.trim())
      fd.append('bio', form.bio.trim())
      const r = await fetch('/api/admin/artists', { method: 'POST', headers: H(pass), body: fd })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Error')
      onAdded(d.artist)
      setDone({ name: form.name.trim(), editKey: d.edit_key })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally { setSaving(false) }
  }

  const reset = () => {
    setForm({ name: '', city: '', country: '', instagram: '', whatsapp: '', email: '', bio: '' })
    setStyles([]); setPhoto(null); setPreview(null); setDone(null); setError('')
  }

  const iCls = 'w-full py-2 px-3 text-sm text-white outline-none rounded-lg bg-white/5 border border-white/10 focus:border-white/30 transition-colors placeholder-white/20'

  if (done) return (
    <div className="max-w-sm flex flex-col gap-4">
      <div className="rounded-xl p-5" style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)' }}>
        <p className="text-sm font-bold mb-1" style={{ color: '#4ade80' }}>Tatuador agregado</p>
        <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>{done.name} ya está visible en el buscador.</p>
        <p className="text-xs mb-2 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Clave de edición</p>
        <div className="flex gap-2">
          <span className="flex-1 py-2 px-3 rounded-lg text-center font-bold font-mono tracking-widest"
            style={{ background: 'rgba(239,255,66,0.06)', border: '1px solid rgba(239,255,66,0.2)', color: '#efff42', fontSize: 16 }}>
            {done.editKey}
          </span>
          <button onClick={() => { navigator.clipboard.writeText(done.editKey); setKeyCopied(true); setTimeout(() => setKeyCopied(false), 2000) }}
            className="px-4 rounded-lg text-xs font-bold"
            style={{ background: keyCopied ? 'rgba(74,222,128,0.15)' : 'rgba(239,255,66,0.1)', border: `1px solid ${keyCopied ? 'rgba(74,222,128,0.4)' : 'rgba(239,255,66,0.3)'}`, color: keyCopied ? '#4ade80' : '#efff42' }}>
            {keyCopied ? '✓' : 'copiar'}
          </button>
        </div>
      </div>
      <button onClick={reset} className="w-full py-2.5 rounded-xl text-sm font-bold"
        style={{ background: '#efff42', color: '#000' }}>
        Agregar otro
      </button>
    </div>
  )

  return (
    <form onSubmit={save} className="max-w-sm flex flex-col gap-4">
      {/* Foto */}
      <label className="cursor-pointer block">
        <p className="text-xs mb-1.5 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Foto *</p>
        {preview ? (
          <div className="relative rounded-xl overflow-hidden" style={{ paddingBottom: '80%' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
              <span className="text-xs text-white/60 bg-black/50 px-3 py-1.5 rounded-full">cambiar</span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl" style={{ paddingBottom: '80%', position: 'relative', border: '2px dashed rgba(255,255,255,0.08)' }}>
            <span className="absolute inset-0 flex items-center justify-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>subir foto</span>
          </div>
        )}
        <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
      </label>

      <div>
        <p className="text-xs mb-1.5 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Nombre *</p>
        <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={iCls} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs mb-1.5 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Ciudad *</p>
          <SuggestInput required value={form.city} onChange={v => setForm(f => ({ ...f, city: v }))}
            suggestions={citySuggestions} className={iCls} />
        </div>
        <div>
          <p className="text-xs mb-1.5 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>País *</p>
          <SuggestInput required value={form.country} onChange={v => setForm(f => ({ ...f, country: v }))}
            suggestions={countrySuggestions} className={iCls} />
        </div>
      </div>

      {/* Estilos */}
      <div className="relative">
        <p className="text-xs mb-1.5 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Estilos</p>
        <button type="button" onClick={() => setStylesOpen(v => !v)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: styles.length ? '#fff' : 'rgba(255,255,255,0.2)' }}>
          <span>{styles.length === 0 ? 'Seleccioná...' : `${styles.length} seleccionado${styles.length > 1 ? 's' : ''}`}</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{stylesOpen ? '▲' : '▼'}</span>
        </button>
        {stylesOpen && (
          <div className="rounded-xl mt-1 overflow-y-auto z-10 relative" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', maxHeight: 200 }}>
            <div className="grid grid-cols-2">
              {availableStyles.map(s => {
                const on = styles.includes(s)
                return (
                  <button key={s} type="button" onClick={() => toggleStyle(s)}
                    className="flex items-center justify-between px-3 py-2 text-sm text-left"
                    style={{ background: on ? 'rgba(239,255,66,0.1)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)', borderRight: '1px solid rgba(255,255,255,0.04)', color: on ? '#efff42' : 'rgba(255,255,255,0.55)', fontWeight: on ? 700 : 400 }}>
                    {s} {on && <span style={{ color: '#efff42', fontSize: 12 }}>✓</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Instagram</p>
          {igStatus === 'checking' && <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>verificando...</span>}
          {igStatus === 'ok'       && <span className="text-xs font-bold" style={{ color: '#4ade80' }}>✓ disponible</span>}
          {igStatus === 'taken'    && <span className="text-xs font-bold" style={{ color: '#f87171' }}>✗ ya registrado</span>}
        </div>
        <input value={form.instagram} onChange={e => { setForm(f => ({ ...f, instagram: e.target.value })); setIgStatus('idle') }}
          placeholder="@usuario" className={iCls}
          style={{ borderColor: igStatus === 'taken' ? 'rgba(248,113,113,0.5)' : igStatus === 'ok' ? 'rgba(74,222,128,0.4)' : undefined }} />
      </div>
      <div>
        <p className="text-xs mb-1.5 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>WhatsApp</p>
        <input value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="+54 9 11 1234 5678" className={iCls} />
      </div>
      <div>
        <p className="text-xs mb-1.5 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Email</p>
        <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="hola@ejemplo.com" className={iCls} />
      </div>

      <div>
        <div className="flex justify-between mb-1.5">
          <span className="text-xs uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Biografía</span>
          <span className="text-xs tabular-nums" style={{ color: form.bio.length >= BIO_MAX ? '#f87171' : 'rgba(255,255,255,0.2)' }}>{form.bio.length}/{BIO_MAX}</span>
        </div>
        <textarea value={form.bio} rows={3}
          onChange={e => { if (e.target.value.length <= BIO_MAX) setForm(f => ({ ...f, bio: e.target.value })) }}
          className={iCls} style={{ resize: 'none', lineHeight: 1.6 }} />
      </div>

      {error && <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>}

      <button type="submit" disabled={saving || igStatus === 'taken'} className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-40"
        style={{ background: '#efff42', color: '#000' }}>
        {saving ? 'Guardando...' : 'Agregar tatuador'}
      </button>
    </form>
  )
}


function buildMsg(a: Artist) {
  return `Hola ${a.name}! Te agregamos a Flashttoo, nuestro buscador de tatuadores. Si querés editar a tu gusto y completar tu perfil, tu clave es: ${a.edit_key}. Es gratuito y sin compromiso. Si no querés estar, podes usá tu clave para eliminarte.`
}

function ArtistGrid({ artists, deleting, onDelete, onToggleVisible, onUpdateKey }: { artists: Artist[]; deleting: string | null; onDelete: (id: string) => void; onToggleVisible: (id: string, visible: boolean) => void; onUpdateKey: (id: string, key: string) => void }) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [editingKey, setEditingKey] = useState<{ id: string; value: string } | null>(null)
  const [savingKey, setSavingKey] = useState(false)
  const igCount: Record<string, number> = {}
  artists.forEach(a => { if (a.instagram) { const k = a.instagram.toLowerCase(); igCount[k] = (igCount[k] || 0) + 1 } })
  const isDupe = (a: Artist) => !!a.instagram && (igCount[a.instagram.toLowerCase()] || 0) > 1

  const filtered = search.trim()
    ? artists.filter(a => a.name.toLowerCase().includes(search.toLowerCase()))
    : artists

  const copyMsg = (a: Artist) => {
    navigator.clipboard.writeText(buildMsg(a))
    setCopiedId(a.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Buscar por nombre..."
        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-white/30 transition-colors mb-1"
      />
      {filtered.map(a => (
        <div key={a.id} className="flex gap-3 p-3 rounded-xl items-start"
          style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${isDupe(a) ? 'rgba(255,80,80,0.4)' : a.visible === false ? 'rgba(255,200,0,0.25)' : 'rgba(255,255,255,0.07)'}`, opacity: a.visible === false ? 0.6 : 1 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.photo_url} alt={a.name} className="rounded-lg object-cover shrink-0" style={{ width: 56, height: 56 }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{a.name}</p>
                <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{a.city}, {a.country}</p>
                {a.instagram && (
                  <a href={`https://www.instagram.com/${a.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs truncate"
                    style={{ color: '#c084fc', textDecoration: 'none' }}>
                    {a.instagram.startsWith('@') ? a.instagram : `@${a.instagram}`}
                  </a>
                )}
                {isDupe(a) && <p className="text-xs font-bold" style={{ color: '#f87171' }}>⚠ duplicado</p>}
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => onToggleVisible(a.id, a.visible === false)}
                  className="text-xs px-2.5 py-1 rounded-lg"
                  style={{ border: `1px solid ${a.visible === false ? 'rgba(255,200,0,0.3)' : 'rgba(255,255,255,0.1)'}`, color: a.visible === false ? 'rgba(255,200,0,0.7)' : 'rgba(255,255,255,0.3)' }}>
                  {a.visible === false ? 'mostrar' : 'ocultar'}
                </button>
                <button onClick={() => onDelete(a.id)} disabled={deleting === a.id}
                  className="text-xs px-2.5 py-1 rounded-lg"
                  style={{ border: '1px solid rgba(255,80,80,0.2)', color: 'rgba(255,100,100,0.6)' }}>
                  {deleting === a.id ? '...' : 'borrar'}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{fmtN(a.profile_views)} vis</span>
              <span style={{ fontSize: 11, color: '#c084fc' }}>{fmtN(a.instagram_clicks)} IG</span>
              <span style={{ fontSize: 11, color: '#4ade80' }}>{fmtN(a.whatsapp_clicks)} WA</span>
              <span style={{ fontSize: 11, color: '#f472b6' }}>{fmtN(a.likes ?? 0)} ♥</span>
            </div>
            <div className="flex items-center justify-between mt-1.5 gap-2">
              {editingKey?.id === a.id ? (
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <input
                    value={editingKey.value}
                    onChange={e => setEditingKey({ id: a.id, value: e.target.value.toUpperCase() })}
                    onKeyDown={async e => {
                      if (e.key === 'Enter') {
                        setSavingKey(true)
                        await onUpdateKey(a.id, editingKey.value)
                        setEditingKey(null); setSavingKey(false)
                      }
                      if (e.key === 'Escape') setEditingKey(null)
                    }}
                    autoFocus
                    className="flex-1 min-w-0 py-0.5 px-2 rounded text-xs font-mono font-bold outline-none"
                    style={{ background: 'rgba(239,255,66,0.08)', border: '1px solid rgba(239,255,66,0.35)', color: '#efff42', letterSpacing: '0.08em', maxWidth: 90 }}
                  />
                  <button onClick={async () => { setSavingKey(true); await onUpdateKey(a.id, editingKey.value); setEditingKey(null); setSavingKey(false) }}
                    disabled={savingKey}
                    className="text-xs px-2 py-0.5 rounded font-bold shrink-0 disabled:opacity-40"
                    style={{ background: 'rgba(239,255,66,0.12)', border: '1px solid rgba(239,255,66,0.3)', color: '#efff42' }}>
                    {savingKey ? '...' : 'ok'}
                  </button>
                  <button onClick={() => setEditingKey(null)}
                    className="text-xs px-1.5 py-0.5 rounded shrink-0"
                    style={{ color: 'rgba(255,255,255,0.25)' }}>✕</button>
                </div>
              ) : (
                <button onClick={() => setEditingKey({ id: a.id, value: a.edit_key })}
                  className="font-mono text-left transition-opacity hover:opacity-70"
                  style={{ fontSize: 11, color: 'rgba(239,255,66,0.55)', letterSpacing: '0.08em' }}
                  title="Editar clave">
                  {a.edit_key}
                </button>
              )}
              <button onClick={() => copyMsg(a)}
                className="text-xs px-2.5 py-1 rounded-lg shrink-0 transition-colors"
                style={{
                  background: copiedId === a.id ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${copiedId === a.id ? 'rgba(74,222,128,0.35)' : 'rgba(255,255,255,0.1)'}`,
                  color: copiedId === a.id ? '#4ade80' : 'rgba(255,255,255,0.35)',
                }}>
                {copiedId === a.id ? '✓ copiado' : 'copiar mensaje'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function StatsPanel({ artists, visits }: { artists: Artist[]; visits: DayVisit[] }) {
  const totalViews = artists.reduce((s, a) => s + a.profile_views, 0)
  const totalIG    = artists.reduce((s, a) => s + a.instagram_clicks, 0)
  const totalWA    = artists.reduce((s, a) => s + a.whatsapp_clicks, 0)
  const totalLikes = artists.reduce((s, a) => s + (a.likes ?? 0), 0)

  const now = new Date()
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    return {
      label: d.toLocaleString('es', { month: 'short' }),
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      count: 0,
    }
  })
  artists.forEach(a => {
    const key = a.created_at.slice(0, 7)
    const m = months.find(x => x.key === key)
    if (m) m.count++
  })
  const maxMonth = Math.max(...months.map(m => m.count), 1)

  const cityMap: Record<string, number> = {}
  artists.forEach(a => { const k = `${a.city}, ${a.country}`; cityMap[k] = (cityMap[k] || 0) + 1 })
  const topCities = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 12)
  const maxCity = Math.max(...topCities.map(c => c[1]), 1)

  const countryMap: Record<string, number> = {}
  artists.forEach(a => { const k = a.country || 'Sin país'; countryMap[k] = (countryMap[k] || 0) + 1 })
  const topCountries = Object.entries(countryMap).sort((a, b) => b[1] - a[1])
  const maxCountry = Math.max(...topCountries.map(c => c[1]), 1)

  const card = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14 }
  const sectionLabel = { fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 16 }

  return (
    <div className="flex flex-col gap-8">

      <div>
        <p style={sectionLabel}>Totales</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            { label: 'Tatuadores', value: artists.length, color: '#efff42' },
            { label: 'Visitas',    value: totalViews,     color: 'rgba(255,255,255,0.7)' },
            { label: 'Clicks IG',  value: totalIG,        color: '#c084fc' },
            { label: 'Clicks WA',  value: totalWA,        color: '#4ade80' },
          ] as const).map(item => (
            <div key={item.label} className="p-4" style={card}>
              <p className="font-bold" style={{ fontSize: 28, color: item.color, lineHeight: 1 }}>{fmtN(item.value)}</p>
              <p className="mt-1.5" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{item.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 px-4 py-3 flex items-center justify-between" style={{ ...card, borderRadius: 10 }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Total likes</p>
          <p className="font-bold" style={{ fontSize: 16, color: '#f472b6' }}>{fmtN(totalLikes)} ♥</p>
        </div>
      </div>

      <div>
        <p style={sectionLabel}>Crecimiento — últimos 12 meses</p>
        <div className="p-5" style={card}>
          <div className="flex items-end gap-1" style={{ height: 88 }}>
            {months.map(m => (
              <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                {m.count > 0 && <span style={{ fontSize: 9, color: '#efff42', fontWeight: 700, lineHeight: 1 }}>{m.count}</span>}
                <div className="w-full"
                  style={{
                    height: m.count ? Math.max(6, Math.round((m.count / maxMonth) * 68)) : 3,
                    background: m.count ? '#efff42' : 'rgba(255,255,255,0.05)',
                    borderRadius: '3px 3px 2px 2px',
                  }} />
              </div>
            ))}
          </div>
          <div className="flex gap-1 mt-2">
            {months.map(m => (
              <div key={m.key} className="flex-1 text-center"
                style={{ fontSize: 8, color: 'rgba(255,255,255,0.18)', textTransform: 'lowercase' }}>
                {m.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Visitantes únicos por día ── */}
      <div>
        <p style={sectionLabel}>Visitantes únicos — últimos 30 días</p>
        <div className="p-5" style={card}>
          {visits.length === 0 ? (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>Sin datos aún</p>
          ) : (() => {
            const max = Math.max(...visits.map(d => d.count), 1)
            const total = visits.reduce((s, d) => s + d.count, 0)
            const today = visits[visits.length - 1]?.count ?? 0
            const W = 300, H = 72, PX = 8, PY = 10
            const cW = W - PX * 2, cH = H - PY * 2
            const pts = visits.map((d, i) => ({
              x: PX + (i / (visits.length - 1)) * cW,
              y: PY + cH - (d.count / max) * cH,
              count: d.count,
              date: d.date,
            }))
            const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
            const area = `${line} L${pts[pts.length-1].x.toFixed(1)},${H} L${pts[0].x.toFixed(1)},${H} Z`

            return (
              <>
                <div className="flex items-end gap-5 mb-4">
                  <div>
                    <p className="font-bold" style={{ fontSize: 26, color: '#efff42', lineHeight: 1 }}>{today}</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>hoy</p>
                  </div>
                  <div>
                    <p className="font-bold" style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', lineHeight: 1 }}>{fmtN(total)}</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>mes</p>
                  </div>
                  <div>
                    <p className="font-bold" style={{ fontSize: 18, color: 'rgba(255,255,255,0.3)', lineHeight: 1 }}>{(total / 30).toFixed(1)}</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>promedio</p>
                  </div>
                </div>
                <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
                  className="w-full" style={{ height: 72, display: 'block' }}>
                  <defs>
                    <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#efff42" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#efff42" stopOpacity="0.01" />
                    </linearGradient>
                  </defs>
                  <path d={area} fill="url(#vg)" />
                  <path d={line} fill="none" stroke="#efff42" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round" />
                  {pts.filter(p => p.count > 0).map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#efff42" />
                  ))}
                </svg>
                <div className="flex justify-between mt-2" style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)' }}>
                  <span>{visits[0]?.date.slice(5).replace('-', '/')}</span>
                  <span>{visits[visits.length - 1]?.date.slice(5).replace('-', '/')}</span>
                </div>
              </>
            )
          })()}
        </div>
      </div>

      <div>
        <p style={sectionLabel}>Tatuadores por país</p>
        <div className="p-5 flex flex-col gap-3" style={card}>
          {topCountries.length === 0
            ? <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>Sin datos</p>
            : topCountries.map(([country, count]) => {
              const pct = Math.round((count / artists.length) * 100)
              return (
                <div key={country} className="flex items-center gap-3">
                  <div style={{ width: 130, fontSize: 12, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0, fontWeight: 600 }}>
                    {country}
                  </div>
                  <div className="flex-1 rounded-full overflow-hidden" style={{ height: 7, background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full rounded-full" style={{ width: `${(count / maxCountry) * 100}%`, background: '#efff42' }} />
                  </div>
                  <div style={{ width: 38, textAlign: 'right', fontSize: 11, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>
                    {pct}%
                  </div>
                  <div style={{ width: 22, textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#efff42', flexShrink: 0 }}>
                    {count}
                  </div>
                </div>
              )
            })
          }
        </div>
      </div>

      <div>
        <p style={sectionLabel}>Tatuadores por ciudad</p>
        <div className="p-5 flex flex-col gap-3" style={card}>
          {topCities.length === 0
            ? <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>Sin datos</p>
            : topCities.map(([city, count]) => (
              <div key={city} className="flex items-center gap-3">
                <div style={{ width: 150, fontSize: 12, color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0 }}>
                  {city}
                </div>
                <div className="flex-1 rounded-full overflow-hidden" style={{ height: 5, background: 'rgba(255,255,255,0.05)' }}>
                  <div className="h-full rounded-full" style={{ width: `${(count / maxCity) * 100}%`, background: '#efff42' }} />
                </div>
                <div style={{ width: 22, textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#efff42', flexShrink: 0 }}>
                  {count}
                </div>
              </div>
            ))
          }
        </div>
      </div>

    </div>
  )
}

export default function AdminPage() {
  const [pass, setPass]       = useState('')
  const [auth, setAuth]       = useState(false)
  const [tab, setTab]         = useState<'artistas' | 'ads' | 'stats' | 'paginas' | 'pendientes' | 'config' | 'contenido' | 'agregar'>('artistas')
  const [artists, setArtists] = useState<Artist[]>([])
  const [ads, setAds]         = useState<Ad[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [deleting, setDeleting]   = useState<string | null>(null)
  const [visits, setVisits]       = useState<DayVisit[]>([])
  const [pages, setPages]         = useState<{ slug: string; title: string; content: string }[]>([])
  const [editingPage, setEditingPage] = useState<string | null>(null)
  const [pageForm, setPageForm]   = useState({ title: '', content: '' })
  const [savingPage, setSavingPage] = useState(false)
  const [moderation, setModeration] = useState(false)
  const [savingMod, setSavingMod]   = useState(false)
  const [showCount, setShowCount]   = useState(false)
  const [savingShowCount, setSavingShowCount] = useState(false)
  const [adminStyles, setAdminStyles] = useState<string[]>(DEFAULT_STYLES)
  const [stylesInput, setStylesInput] = useState('')
  const [savingStyles, setSavingStyles] = useState(false)
  const [contentCards, setContentCards] = useState<ContentCard[]>([])
  const [savingContent, setSavingContent] = useState(false)
  const [menuOpen, setMenuOpen]     = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Ad form
  const [adForm, setAdForm] = useState({ title: '', link: '', city: '' })
  const [adPhoto, setAdPhoto] = useState<File | null>(null)
  const [adPreview, setAdPreview] = useState<string | null>(null)
  const [savingAd, setSavingAd] = useState(false)
  const [adError, setAdError] = useState('')

  const login = (e: { preventDefault: () => void }) => {
    e.preventDefault()
    fetch('/api/admin/verify', { method: 'POST', headers: H(pass) })
      .then(r => r.json())
      .then(d => {
        if (d.ok) { setAuth(true); loadAll(pass) }
        else setError('Contraseña incorrecta')
      })
  }

  const loadAll = (p: string) => {
    setLoading(true)
    Promise.allSettled([
      fetch('/api/admin/artists', { headers: H(p) }).then(r => r.json()),
      fetch('/api/admin/ads', { headers: H(p) }).then(r => r.json()),
      fetch('/api/admin/stats/visits', { headers: H(p) }).then(r => r.json()),
      fetch('/api/admin/pages', { headers: H(p) }).then(r => r.json()),
      fetch('/api/admin/settings', { headers: H(p) }).then(r => r.json()),
    ]).then(([a, b, v, pg, cfg]) => {
      if (a.status === 'fulfilled') setArtists(a.value.artists || [])
      if (b.status === 'fulfilled') setAds(b.value.ads || [])
      if (v.status === 'fulfilled') setVisits(v.value.days || [])
      if (pg.status === 'fulfilled') setPages(pg.value.pages || [])
      if (cfg.status === 'fulfilled') {
        setModeration(cfg.value.settings?.moderation === true)
        setShowCount(cfg.value.settings?.show_count === true)
        if (Array.isArray(cfg.value.settings?.styles) && cfg.value.settings.styles.length > 0)
          setAdminStyles(cfg.value.settings.styles)
        if (Array.isArray(cfg.value.settings?.content_cards))
          setContentCards(cfg.value.settings.content_cards)
      }
      setLoading(false)
    })
  }

  const toggleModeration = async (val: boolean) => {
    setSavingMod(true)
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { ...H(pass), 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'moderation', value: val }),
    })
    setModeration(val)
    setSavingMod(false)
  }

  const toggleShowCount = async (val: boolean) => {
    setSavingShowCount(true)
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { ...H(pass), 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'show_count', value: val }),
    })
    setShowCount(val)
    setSavingShowCount(false)
  }

  const approveArtist = async (id: string) => {
    await fetch(`/api/admin/artists/${id}`, {
      method: 'PATCH',
      headers: { ...H(pass), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    })
    setArtists(prev => prev.map(a => a.id === id ? { ...a, status: 'active' } : a))
  }

  const rejectArtist = async (id: string) => {
    if (!confirm('¿Rechazar y eliminar este perfil?')) return
    setDeleting(id)
    await fetch(`/api/admin/artists/${id}`, { method: 'DELETE', headers: H(pass) })
    setArtists(prev => prev.filter(a => a.id !== id))
    setDeleting(null)
  }

  const savePage = async () => {
    if (!editingPage) return
    setSavingPage(true)
    await fetch('/api/admin/pages', {
      method: 'PATCH',
      headers: { ...H(pass), 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: editingPage, ...pageForm }),
    })
    setPages(prev => prev.map(p => p.slug === editingPage ? { ...p, ...pageForm } : p))
    setEditingPage(null)
    setSavingPage(false)
  }

  const deleteArtist = async (id: string) => {
    if (!confirm('¿Borrar este tatuador?')) return
    setDeleting(id)
    await fetch(`/api/admin/artists/${id}`, { method: 'DELETE', headers: H(pass) })
    setArtists(prev => prev.filter(a => a.id !== id))
    setDeleting(null)
  }

  const updateArtistKey = async (id: string, key: string) => {
    const trimmed = key.trim().toUpperCase()
    if (!trimmed) return
    await fetch(`/api/admin/artists/${id}`, {
      method: 'PATCH',
      headers: { ...H(pass), 'Content-Type': 'application/json' },
      body: JSON.stringify({ edit_key: trimmed }),
    })
    setArtists(prev => prev.map(a => a.id === id ? { ...a, edit_key: trimmed } : a))
  }

  const toggleVisible = async (id: string, visible: boolean) => {
    await fetch(`/api/admin/artists/${id}`, {
      method: 'PATCH',
      headers: { ...H(pass), 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible }),
    })
    setArtists(prev => prev.map(a => a.id === id ? { ...a, visible } : a))
  }

  const deleteAd = async (id: string) => {
    if (!confirm('¿Borrar este aviso?')) return
    setDeleting(id)
    await fetch(`/api/admin/ads/${id}`, { method: 'DELETE', headers: H(pass) })
    setAds(prev => prev.filter(a => a.id !== id))
    setDeleting(null)
  }

  const toggleAd = async (id: string, active: boolean) => {
    await fetch(`/api/admin/ads/${id}`, { method: 'PATCH', headers: { ...H(pass), 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !active }) })
    setAds(prev => prev.map(a => a.id === id ? { ...a, active: !active } : a))
  }

  const handleAdPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setAdPreview(URL.createObjectURL(file))
    const img = new window.Image()
    img.onload = () => {
      const MAX = 1200; let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX }
        else { width = Math.round(width * MAX / height); height = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(blob => { if (blob) setAdPhoto(new File([blob], 'ad.webp', { type: 'image/webp' })) }, 'image/webp', 0.85)
    }
    img.src = URL.createObjectURL(file)
  }

  const saveAd = async (e: { preventDefault: () => void }) => {
    e.preventDefault(); setAdError('')
    if (!adPhoto) { setAdError('Agregá una imagen'); return }
    if (!adForm.title.trim() || !adForm.link.trim()) { setAdError('Completá título y link'); return }
    setSavingAd(true)
    try {
      const fd = new FormData()
      fd.append('photo', adPhoto)
      fd.append('title', adForm.title.trim())
      fd.append('link', adForm.link.trim())
      fd.append('city', adForm.city.trim())
      const r = await fetch('/api/admin/ads', { method: 'POST', headers: H(pass), body: fd })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Error')
      setAds(prev => [d.ad, ...prev])
      setAdForm({ title: '', link: '', city: '' }); setAdPhoto(null); setAdPreview(null)
    } catch (err: unknown) {
      setAdError(err instanceof Error ? err.message : 'Error')
    } finally { setSavingAd(false) }
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  if (!auth) return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{ background: '#000' }}>
      <form onSubmit={login} className="w-full max-w-xs flex flex-col gap-4">
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>PANEL</p>
        <input type="password" placeholder="contraseña" value={pass}
          onChange={e => setPass(e.target.value)} autoFocus
          className="py-2.5 px-4 text-sm text-white outline-none rounded-lg"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button type="submit" className="py-2.5 font-bold text-sm rounded-lg"
          style={{ background: '#efff42', color: '#000' }}>Entrar</button>
      </form>
    </main>
  )

  // ── Panel ──────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen px-4 py-4 sm:p-6" style={{ background: '#000' }}>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6">
          {(() => {
            const pendingCount = artists.filter(a => a.status === 'pending').length
            const tabs = [
              { key: 'artistas',   label: `Tatuadores (${artists.filter(a => a.status !== 'pending').length})` },
              { key: 'ads',        label: `Publicidades (${ads.length})` },
              { key: 'stats',      label: 'Estadísticas' },
              { key: 'paginas',    label: 'Páginas' },
              { key: 'pendientes', label: pendingCount > 0 ? `Pendientes (${pendingCount})` : 'Pendientes', alert: pendingCount > 0 },
              { key: 'config',     label: 'Config' },
              { key: 'contenido',  label: 'Contenido' },
              { key: 'agregar',    label: '+ Agregar' },
            ] as const
            const current = tabs.find(t => t.key === tab)
            return (
              <div ref={menuRef} className="relative" style={{ minWidth: 0, flex: 1, maxWidth: 280 }}>
                <button onClick={() => setMenuOpen(v => !v)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
                  <span className="truncate" style={{ color: ('alert' in (current ?? {}) && (current as {alert?:boolean}).alert) ? '#f87171' : '#fff' }}>
                    {current?.label}
                  </span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{menuOpen ? '▲' : '▼'}</span>
                </button>
                {menuOpen && (
                  <div className="absolute left-0 right-0 mt-1 rounded-xl overflow-hidden z-50"
                    style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 16px 40px rgba(0,0,0,0.8)' }}>
                    {tabs.map(t => (
                      <button key={t.key}
                        onClick={() => { setTab(t.key); setMenuOpen(false) }}
                        className="w-full text-left px-4 py-3 text-sm transition-colors"
                        style={{
                          background: tab === t.key ? 'rgba(239,255,66,0.08)' : 'transparent',
                          color: tab === t.key ? '#efff42' : ('alert' in t && t.alert) ? '#f87171' : 'rgba(255,255,255,0.6)',
                          fontWeight: tab === t.key ? 700 : 400,
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                        }}
                        onMouseEnter={e => { if (tab !== t.key) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                        onMouseLeave={e => { if (tab !== t.key) e.currentTarget.style.background = 'transparent' }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}
          <Link href="/" className="text-xs shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }}>ver web →</Link>
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>Cargando...</p>
        ) : tab === 'artistas' ? (

          // ── ARTISTAS ────────────────────────────────────────────────────────
          <ArtistGrid artists={artists.filter(a => a.status !== 'pending')} deleting={deleting} onDelete={deleteArtist} onToggleVisible={toggleVisible} onUpdateKey={updateArtistKey} />

        ) : tab === 'stats' ? (

          // ── ESTADÍSTICAS ────────────────────────────────────────────────────
          <StatsPanel artists={artists} visits={visits} />

        ) : tab === 'paginas' ? (

          // ── PÁGINAS LEGALES ─────────────────────────────────────────────────
          <div className="flex flex-col gap-4">
            {editingPage === null ? (
              pages.map(p => (
                <div key={p.slug} className="rounded-xl p-4 flex items-center justify-between"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div>
                    <p className="text-sm font-bold text-white">{p.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      flashttoo.com/{p.slug}
                    </p>
                  </div>
                  <button
                    onClick={() => { setEditingPage(p.slug); setPageForm({ title: p.title, content: p.content }) }}
                    className="text-xs px-4 py-2 rounded-lg transition-all"
                    style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(239,255,66,0.4)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}>
                    editar
                  </button>
                </div>
              ))
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold" style={{ color: '#efff42' }}>
                    Editando: {pages.find(p => p.slug === editingPage)?.title}
                  </p>
                  <button onClick={() => setEditingPage(null)}
                    className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    cancelar
                  </button>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Título</p>
                  <input value={pageForm.title}
                    onChange={e => setPageForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full py-2 px-3 text-sm text-white outline-none rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Contenido</p>
                  <textarea value={pageForm.content}
                    onChange={e => setPageForm(f => ({ ...f, content: e.target.value }))}
                    rows={20}
                    className="w-full py-2 px-3 text-sm text-white outline-none rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', resize: 'vertical', lineHeight: 1.7, fontFamily: 'monospace', fontSize: 13 }} />
                </div>
                <button onClick={savePage} disabled={savingPage}
                  className="self-end px-6 py-2 rounded-lg font-bold text-sm disabled:opacity-50"
                  style={{ background: '#efff42', color: '#000' }}>
                  {savingPage ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            )}
          </div>

        ) : tab === 'pendientes' ? (

          // ── PENDIENTES ───────────────────────────────────────────────────────
          (() => {
            const pending = artists.filter(a => a.status === 'pending')
            if (pending.length === 0) return (
              <p className="text-sm py-12 text-center" style={{ color: 'rgba(255,255,255,0.15)' }}>
                No hay perfiles pendientes
              </p>
            )
            return (
              <div className="flex flex-col gap-3">
                {pending.map(a => (
                  <div key={a.id} className="rounded-xl overflow-hidden flex gap-4 p-4 items-center"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,200,0,0.2)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.photo_url} alt={a.name}
                      className="rounded-lg object-cover shrink-0"
                      style={{ width: 64, height: 64 }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{a.name}</p>
                      <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{a.city}, {a.country}</p>
                      {a.instagram && <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.25)' }}>{a.instagram}</p>}
                      <p className="text-xs mt-1 font-mono" style={{ color: 'rgba(239,255,66,0.5)' }}>{a.edit_key}</p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <button onClick={() => approveArtist(a.id)}
                        className="text-xs px-4 py-2 rounded-lg font-bold transition-colors"
                        style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.35)', color: '#4ade80' }}>
                        Aprobar
                      </button>
                      <button onClick={() => rejectArtist(a.id)} disabled={deleting === a.id}
                        className="text-xs px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
                        style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.25)', color: 'rgba(255,100,100,0.7)' }}>
                        {deleting === a.id ? '...' : 'Rechazar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          })()

        ) : tab === 'config' ? (

          // ── CONFIG ───────────────────────────────────────────────────────────
          <div className="max-w-sm flex flex-col gap-6">

            {/* Moderación */}
            <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Moderación de nuevos perfiles</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                    Cuando está activa, los perfiles nuevos quedan en revisión hasta que los apruebes.
                  </p>
                </div>
                <button
                  onClick={() => toggleModeration(!moderation)}
                  disabled={savingMod}
                  className="ml-4 shrink-0 rounded-full transition-all disabled:opacity-50"
                  style={{ width: 48, height: 28, background: moderation ? '#efff42' : 'rgba(255,255,255,0.1)', position: 'relative' }}>
                  <span style={{
                    position: 'absolute', top: 4,
                    left: moderation ? 24 : 4,
                    width: 20, height: 20,
                    borderRadius: '50%',
                    background: moderation ? '#000' : 'rgba(255,255,255,0.4)',
                    transition: 'left 0.2s',
                  }} />
                </button>
              </div>
              <p className="text-xs mt-3 font-bold" style={{ color: moderation ? '#efff42' : 'rgba(255,255,255,0.2)' }}>
                {moderation ? 'Activada — nuevos perfiles van a revisión' : 'Desactivada — nuevos perfiles se publican directamente'}
              </p>
            </div>

            {/* Mostrar cantidad */}
            <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Mostrar cantidad de tatuadores</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                    Muestra el contador debajo de los filtros en la página principal.
                  </p>
                </div>
                <button
                  onClick={() => toggleShowCount(!showCount)}
                  disabled={savingShowCount}
                  className="ml-4 shrink-0 rounded-full transition-all disabled:opacity-50"
                  style={{ width: 48, height: 28, background: showCount ? '#efff42' : 'rgba(255,255,255,0.1)', position: 'relative' }}>
                  <span style={{
                    position: 'absolute', top: 4,
                    left: showCount ? 24 : 4,
                    width: 20, height: 20,
                    borderRadius: '50%',
                    background: showCount ? '#000' : 'rgba(255,255,255,0.4)',
                    transition: 'left 0.2s',
                  }} />
                </button>
              </div>
              <p className="text-xs mt-3 font-bold" style={{ color: showCount ? '#efff42' : 'rgba(255,255,255,0.2)' }}>
                {showCount ? 'Activado — se ve el contador en la home' : 'Desactivado — contador oculto'}
              </p>
            </div>

            {/* Estilos */}
            <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div>
                <p className="text-sm font-bold text-white">Estilos de tatuaje</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                  Estos estilos aparecen en el buscador y en los formularios de alta.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {adminStyles.map(s => (
                  <span key={s} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
                    {s}
                    <button type="button"
                      onClick={() => setAdminStyles(prev => prev.filter(x => x !== s))}
                      style={{ color: 'rgba(255,100,100,0.6)', lineHeight: 1, marginLeft: 2 }}>×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={stylesInput}
                  onChange={e => setStylesInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const v = stylesInput.trim()
                      if (v && !adminStyles.includes(v)) setAdminStyles(prev => [...prev, v])
                      setStylesInput('')
                    }
                  }}
                  placeholder="Nuevo estilo..."
                  className="flex-1 py-2 px-3 text-sm text-white outline-none rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
                <button type="button"
                  onClick={() => {
                    const v = stylesInput.trim()
                    if (v && !adminStyles.includes(v)) setAdminStyles(prev => [...prev, v])
                    setStylesInput('')
                  }}
                  className="px-4 rounded-lg text-sm font-bold"
                  style={{ background: 'rgba(239,255,66,0.1)', border: '1px solid rgba(239,255,66,0.25)', color: '#efff42' }}>
                  +
                </button>
              </div>
              <button
                onClick={async () => {
                  setSavingStyles(true)
                  await fetch('/api/admin/settings', {
                    method: 'PATCH',
                    headers: { ...H(pass), 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: 'styles', value: adminStyles }),
                  })
                  setSavingStyles(false)
                }}
                disabled={savingStyles}
                className="self-end px-5 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                style={{ background: '#efff42', color: '#000' }}>
                {savingStyles ? 'Guardando...' : 'Guardar estilos'}
              </button>
            </div>

          </div>

        ) : tab === 'contenido' ? (

          // ── CONTENIDO ────────────────────────────────────────────────────────
          <div className="flex flex-col gap-5" style={{ maxWidth: 600 }}>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)', lineHeight: 1.6 }}>
              Las tarjetas aparecen en el feed cada ~20 posiciones. Al hacer clic se abre un modal con el contenido completo.
            </p>

            {/* Lista de tarjetas existentes */}
            <div className="flex flex-col gap-4">
              {contentCards.map((card, idx) => (
                <div key={card.id} className="rounded-xl p-4 flex flex-col gap-3"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center gap-2">
                    <input
                      value={card.title}
                      onChange={e => setContentCards(prev => prev.map((c, i) => i === idx ? { ...c, title: e.target.value } : c))}
                      placeholder="Título"
                      className="flex-1 py-2 px-3 text-sm font-bold text-white outline-none rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                    <button
                      onClick={() => setContentCards(prev => prev.map((c, i) => i === idx ? { ...c, active: !c.active } : c))}
                      className="text-xs px-3 py-1.5 rounded-full shrink-0"
                      style={{
                        border: `1px solid ${card.active ? 'rgba(74,222,128,0.3)' : 'rgba(255,80,80,0.25)'}`,
                        color: card.active ? '#4ade80' : 'rgba(255,100,100,0.6)',
                        background: card.active ? 'rgba(74,222,128,0.07)' : 'rgba(255,80,80,0.05)',
                      }}>
                      {card.active ? '✓ visible' : '✗ oculta'}
                    </button>
                    <button
                      onClick={() => setContentCards(prev => prev.filter((_, i) => i !== idx))}
                      className="text-xs px-3 py-1.5 rounded-full shrink-0"
                      style={{ border: '1px solid rgba(255,80,80,0.2)', color: 'rgba(255,100,100,0.5)' }}>
                      borrar
                    </button>
                  </div>
                  <textarea
                    value={card.body}
                    onChange={e => setContentCards(prev => prev.map((c, i) => i === idx ? { ...c, body: e.target.value } : c))}
                    rows={4}
                    placeholder="Contenido del modal..."
                    className="w-full py-2 px-3 text-sm text-white outline-none rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', resize: 'vertical', lineHeight: 1.7 }} />
                </div>
              ))}
            </div>

            {/* Nueva tarjeta */}
            <button
              onClick={() => setContentCards(prev => [...prev, { id: Date.now().toString(36), title: '', body: '', active: true }])}
              className="py-3 rounded-xl text-sm font-bold transition-all"
              style={{ border: '2px dashed rgba(239,255,66,0.15)', color: 'rgba(239,255,66,0.4)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(239,255,66,0.35)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(239,255,66,0.15)')}>
              + Nueva tarjeta
            </button>

            {/* Guardar */}
            <button
              onClick={async () => {
                setSavingContent(true)
                await fetch('/api/admin/settings', {
                  method: 'PATCH',
                  headers: { ...H(pass), 'Content-Type': 'application/json' },
                  body: JSON.stringify({ key: 'content_cards', value: contentCards }),
                })
                setSavingContent(false)
              }}
              disabled={savingContent}
              className="self-end px-6 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50"
              style={{ background: '#efff42', color: '#000' }}>
              {savingContent ? 'Guardando...' : 'Guardar tarjetas'}
            </button>
          </div>

        ) : tab === 'agregar' ? (

          // ── AGREGAR ──────────────────────────────────────────────────────────
          <AddArtistForm pass={pass} onAdded={a => setArtists(prev => [a, ...prev])} availableStyles={adminStyles} existingArtists={artists} />

        ) : (

          // ── ADS ─────────────────────────────────────────────────────────────
          <div className="flex flex-col gap-8">

            {/* Formulario nueva publicidad */}
            <form onSubmit={saveAd} className="rounded-xl p-5 flex flex-col gap-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-bold" style={{ color: '#efff42', letterSpacing: '0.08em' }}>NUEVA PUBLICIDAD</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Imagen */}
                <label className="cursor-pointer block">
                  <p className="text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Imagen</p>
                  {adPreview ? (
                    <div className="relative rounded-xl overflow-hidden" style={{ paddingBottom: '60%' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={adPreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="rounded-xl flex items-center justify-center text-xs"
                      style={{ paddingBottom: '60%', position: 'relative', border: '2px dashed rgba(255,255,255,0.08)' }}>
                      <span className="absolute" style={{ color: 'rgba(255,255,255,0.2)' }}>subir imagen</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleAdPhoto} className="hidden" />
                </label>

                <div className="flex flex-col gap-3">
                  <AdField label="Título">
                    <input value={adForm.title} onChange={e => setAdForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="Estudio Roma · Buenos Aires" className={iCls} />
                  </AdField>
                  <AdField label="Link (URL)">
                    <input value={adForm.link} onChange={e => setAdForm(f => ({ ...f, link: e.target.value }))}
                      placeholder="https://instagram.com/..." className={iCls} />
                  </AdField>
                  <AdField label="Ubicación (vacío = todos lados)">
                    <input value={adForm.city} onChange={e => setAdForm(f => ({ ...f, city: e.target.value }))}
                      placeholder="Buenos Aires · Argentina · vacío = global" className={iCls} />
                  </AdField>
                </div>
              </div>

              {adError && <p className="text-xs text-red-400">{adError}</p>}
              <button type="submit" disabled={savingAd}
                className="self-end px-6 py-2 rounded-lg font-bold text-sm disabled:opacity-50"
                style={{ background: '#efff42', color: '#000' }}>
                {savingAd ? 'Guardando...' : 'Publicar'}
              </button>
            </form>

            {/* Lista ads */}
            <div className="flex flex-col gap-3">
              {ads.length === 0 && (
                <p className="text-sm text-center py-8" style={{ color: 'rgba(255,255,255,0.1)' }}>Sin publicidades</p>
              )}
              {ads.map(ad => (
                <div key={ad.id} className="rounded-xl p-4 flex items-center gap-4"
                  style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${ad.active ? 'rgba(239,255,66,0.12)' : 'rgba(255,255,255,0.06)'}` }}>
                  <div className="shrink-0 rounded-lg overflow-hidden" style={{ width: 80, height: 56 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{ad.title}</p>
                    <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {ad.city || 'global — todos lados'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#efff42', opacity: 0.7 }}>
                      {ad.clicks} clicks
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => toggleAd(ad.id, ad.active)}
                      className="text-xs px-3 py-1 rounded-full transition-all"
                      style={{
                        border: `1px solid ${ad.active ? 'rgba(239,255,66,0.3)' : 'rgba(255,255,255,0.1)'}`,
                        color: ad.active ? '#efff42' : 'rgba(255,255,255,0.3)',
                        background: ad.active ? 'rgba(239,255,66,0.07)' : 'transparent',
                      }}>
                      {ad.active ? 'activo' : 'pausado'}
                    </button>
                    <button onClick={() => deleteAd(ad.id)} disabled={deleting === ad.id}
                      className="text-xs px-3 py-1 rounded-full transition-all"
                      style={{ border: '1px solid rgba(255,80,80,0.2)', color: 'rgba(255,100,100,0.5)' }}>
                      {deleting === ad.id ? '...' : 'borrar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

function AdField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      {children}
    </div>
  )
}

const iCls = 'w-full py-2 px-3 text-sm text-white outline-none rounded-lg'
  + ' bg-white/5 border border-white/10 focus:border-white/30 transition-colors placeholder-white/20'
