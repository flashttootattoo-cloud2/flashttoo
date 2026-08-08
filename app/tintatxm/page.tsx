'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type DayVisit = { date: string; count: number }
type Visit = { from: string; to: string; city: string; country: string }
type InstallStats = { days: DayVisit[]; byPlatform: { ios: number; android: number; other: number }; total: number }

type Artist = {
  id: string; name: string; city: string; country: string
  photo_url: string; instagram: string | null; whatsapp: string | null
  profile_views: number; instagram_clicks: number; whatsapp_clicks: number; likes: number
  edit_key: string; visible: boolean; created_at: string; status: string
  verification_word: string | null
  pending_reason: string | null
}

function fmtN(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.0', '') + 'k'
  return String(n)
}

type Ad = {
  id: string; title: string; image_url: string; link: string | null
  city: string | null; country: string | null
  instagram: string | null; whatsapp: string | null; website: string | null
  edit_key: string | null; clicks: number; active: boolean; created_at: string
  show_global: boolean; expires_at: string | null
}

type ContentCard = {
  id: string; title: string; body: string; active: boolean
}

type SponsorAdmin = {
  id: string; name: string; logo_url: string; link: string | null
  country: string | null; active: boolean; starts_at: string
  expires_at: string | null; created_at: string; keep_color: boolean
}

type SponsorV2Admin = {
  id: string; name: string; logo_url: string; bg_image_url: string | null
  detail_logo_url: string | null; detail_logo_mode: string | null
  description: string | null; link: string | null; level: string
  city: string | null; country: string | null; active: boolean
  keep_color: boolean; starts_at: string; expires_at: string | null
  created_at: string; notes: string | null; clicks: number; logo_scale: number | null
  whatsapp: string | null
}

type Convention = {
  id: string; name: string | null; image_url: string; link: string | null
  expires_at: string | null; active: boolean; created_at: string; clicks: number
  country: string | null
}

type StatsV2Bucket = { detail_open: number; banner_click: number; detail_click: number }
type StatsV2Data = {
  sponsor: { id: string; name: string; logo_url: string; keep_color: boolean; logo_scale: number | null; clicks: number }
  totals: StatsV2Bucket
  monthly: Record<string, StatsV2Bucket>
}

function fmtAvg(total: number): string {
  const v = total / 6
  return v === Math.floor(v) ? String(Math.floor(v)) : v.toFixed(1)
}

const MONTH_NAMES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
function monthLabel(key: string) {
  return MONTH_NAMES[parseInt(key.split('-')[1], 10) - 1] ?? key
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
  const [done, setDone]         = useState<{ name: string; editKey: string; id: string; instagram?: string } | null>(null)
  const [keyCopied, setKeyCopied]   = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [igStatus, setIgStatus] = useState<'idle'|'checking'|'ok'|'taken'>('idle')
  const [visits, setVisits] = useState<Visit[]>([])
  const [visitOpen, setVisitOpen] = useState(false)
  const [addingVisit, setAddingVisit] = useState(false)
  const [newVisit, setNewVisit] = useState({ from: '', to: '', city: '', country: '' })
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
      const r = await fetch(`/api/check-ig?handle=${encodeURIComponent(handle)}`)
      const d = await r.json()
      setIgStatus(d.available ? 'ok' : 'taken')
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
      fd.append('visits', JSON.stringify(visits))
      const r = await fetch('/api/admin/artists', { method: 'POST', headers: H(pass), body: fd })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Error')
      onAdded(d.artist)
      setDone({ name: form.name.trim(), editKey: d.edit_key, id: d.artist.id, instagram: d.artist.instagram })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally { setSaving(false) }
  }

  const reset = () => {
    setForm({ name: '', city: '', country: '', instagram: '', whatsapp: '', email: '', bio: '' })
    setStyles([]); setPhoto(null); setPreview(null); setDone(null); setError('')
    setVisits([]); setVisitOpen(false); setAddingVisit(false); setNewVisit({ from: '', to: '', city: '', country: '' })
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
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs mb-2 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Link del perfil</p>
          <div className="flex gap-2">
            <span className="flex-1 py-2 px-3 rounded-lg text-xs truncate"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
              {`flashttoo.com/?artista=${done.instagram ? done.instagram.replace('@', '') : done.id}`}
            </span>
            <button onClick={() => { navigator.clipboard.writeText(`https://flashttoo.com/?artista=${done.instagram ? done.instagram.replace('@', '') : done.id}`); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000) }}
              className="px-4 rounded-lg text-xs font-bold shrink-0"
              style={{ background: linkCopied ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${linkCopied ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.12)'}`, color: linkCopied ? '#4ade80' : 'rgba(255,255,255,0.5)' }}>
              {linkCopied ? '✓' : 'copiar'}
            </button>
          </div>
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
        {igStatus === 'taken' && (
          <p className="text-xs leading-relaxed" style={{ color: 'rgba(248,113,113,0.7)', marginTop: 6 }}>
            Este Instagram ya tiene un perfil en Flashttoo. Si es tuyo y perdiste la clave, escribinos.
          </p>
        )}
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

      {/* Próximas fechas */}
      <div>
        <button
          type="button"
          onClick={() => { setVisitOpen(v => !v); setAddingVisit(false) }}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all"
          style={{
            background: visitOpen ? 'rgba(239,255,66,0.06)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${visitOpen ? 'rgba(239,255,66,0.2)' : 'rgba(255,255,255,0.08)'}`,
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: visitOpen ? '#efff42' : 'rgba(255,255,255,0.6)' }}>
              Próximas fechas — ¿dónde estarás?
            </span>
            {visits.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ background: 'rgba(239,255,66,0.15)', color: '#efff42' }}>
                {visits.length}
              </span>
            )}
          </div>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>{visitOpen ? '▲' : '▼'}</span>
        </button>

        {visitOpen && (
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-xs px-3 py-2 rounded-lg" style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              Las fechas se eliminan automáticamente cuando expiran.
            </p>
            {visits.map((v, i) => (
              <div key={i} className="flex items-start justify-between px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(239,255,66,0.04)', border: '1px solid rgba(239,255,66,0.12)' }}>
                <div>
                  <p className="text-sm font-medium text-white">{v.city}, {v.country}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                    {new Date(v.from + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} – {new Date(v.to + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <button type="button" onClick={() => setVisits(prev => prev.filter((_, idx) => idx !== i))}
                  style={{ color: 'rgba(255,255,255,0.2)', fontSize: 20, lineHeight: 1, padding: '0 4px', marginTop: -2 }}>×</button>
              </div>
            ))}

            {addingVisit ? (
              <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Desde</p>
                    <input type="date" value={newVisit.from} onChange={e => setNewVisit(v => ({ ...v, from: e.target.value }))}
                      className={iCls} />
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Hasta</p>
                    <input type="date" value={newVisit.to} onChange={e => setNewVisit(v => ({ ...v, to: e.target.value }))}
                      className={iCls} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Ciudad</p>
                    <input value={newVisit.city} onChange={e => setNewVisit(v => ({ ...v, city: e.target.value }))}
                      placeholder="Santiago" className={iCls} />
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>País</p>
                    <input value={newVisit.country} onChange={e => setNewVisit(v => ({ ...v, country: e.target.value }))}
                      placeholder="Chile" className={iCls} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setAddingVisit(false); setNewVisit({ from: '', to: '', city: '', country: '' }) }}
                    className="flex-1 py-2 rounded-lg text-xs"
                    style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)' }}>
                    Cancelar
                  </button>
                  <button type="button"
                    disabled={!newVisit.from || !newVisit.to || !newVisit.city.trim() || !newVisit.country.trim()}
                    onClick={() => {
                      setVisits(prev => [...prev, newVisit])
                      setNewVisit({ from: '', to: '', city: '', country: '' })
                      setAddingVisit(false)
                    }}
                    className="flex-1 py-2 rounded-lg text-xs font-bold disabled:opacity-40"
                    style={{ background: '#efff42', color: '#000' }}>
                    Agregar
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setAddingVisit(true)}
                className="w-full py-2.5 rounded-xl text-xs transition-all"
                style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }}>
                + Agregar fecha
              </button>
            )}
          </div>
        )}
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
  const [editingKey, setEditingKey] = useState<{ id: string; value: string } | null>(null)
  const [savingKey, setSavingKey] = useState(false)
  const [marked, setMarked] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('admin_marked') || '[]')) } catch { return new Set() }
  })
  const toggleMark = (id: string) => setMarked(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id)
    try { localStorage.setItem('admin_marked', JSON.stringify([...s])) } catch {}
    return s
  })
  const igCount: Record<string, number> = {}
  artists.forEach(a => { if (a.instagram) { const k = a.instagram.toLowerCase(); igCount[k] = (igCount[k] || 0) + 1 } })
  const isDupe = (a: Artist) => !!a.instagram && (igCount[a.instagram.toLowerCase()] || 0) > 1

  const copyMsg = (a: Artist) => {
    navigator.clipboard.writeText(buildMsg(a))
    setCopiedId(a.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="flex flex-col gap-2">
      {marked.size > 0 && (
        <p className="text-xs mb-1" style={{ color: 'rgba(239,255,66,0.6)' }}>{marked.size} marcado{marked.size !== 1 ? 's' : ''}</p>
      )}
      {artists.map(a => (
        <div key={a.id} className="flex gap-3 p-3 rounded-xl items-start"
          style={{ background: marked.has(a.id) ? 'rgba(239,255,66,0.04)' : 'rgba(255,255,255,0.03)', border: `1px solid ${marked.has(a.id) ? 'rgba(239,255,66,0.25)' : isDupe(a) ? 'rgba(255,80,80,0.4)' : a.visible === false ? 'rgba(255,200,0,0.25)' : 'rgba(255,255,255,0.07)'}`, opacity: a.visible === false ? 0.6 : 1 }}>
          <button onClick={() => toggleMark(a.id)}
            className="shrink-0 mt-0.5 rounded"
            style={{
              width: 18, height: 18,
              border: `1.5px solid ${marked.has(a.id) ? '#efff42' : 'rgba(255,255,255,0.2)'}`,
              background: marked.has(a.id) ? '#efff42' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}>
            {marked.has(a.id) && <span style={{ fontSize: 11, color: '#000', fontWeight: 900, lineHeight: 1 }}>✓</span>}
          </button>
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

type StudioStat = { profile_views: number; instagram_clicks: number; whatsapp_clicks: number; website_clicks: number }

type SearchStat = { type: string; value: string; count: number }
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const TOP = 10
function StatsPanel({ artists, visits, installs, studios, searchStats, appEventCounts }: { artists: Artist[]; visits: DayVisit[]; installs: InstallStats; studios: StudioStat[]; searchStats: { countries: SearchStat[]; cities: SearchStat[]; styles: SearchStat[] }; appEventCounts: Record<string, number> }) {
  const [showAllCountries, setShowAllCountries]       = useState(false)
  const [showAllCities, setShowAllCities]             = useState(false)
  const [showAllStyles, setShowAllStyles]             = useState(false)
  const [showAllArtistCountries, setShowAllArtistCountries] = useState(false)
  const [showAllArtistCities, setShowAllArtistCities]       = useState(false)
  const [visitHover, setVisitHover]                   = useState<{ x: number; y: number; count: number; date: string } | null>(null)
  const totalViews = artists.reduce((s, a) => s + a.profile_views, 0)
  const totalIG    = artists.reduce((s, a) => s + a.instagram_clicks, 0)
  const totalWA    = artists.reduce((s, a) => s + a.whatsapp_clicks, 0)
  const totalLikes = artists.reduce((s, a) => s + (a.likes ?? 0), 0)

  const studioViews = studios.reduce((s, x) => s + (x.profile_views ?? 0), 0)
  const studioIG    = studios.reduce((s, x) => s + (x.instagram_clicks ?? 0), 0)
  const studioWA    = studios.reduce((s, x) => s + (x.whatsapp_clicks ?? 0), 0)
  const studioWeb   = studios.reduce((s, x) => s + (x.website_clicks ?? 0), 0)

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
        <p style={sectionLabel}>Tatuadores</p>
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
        <p style={sectionLabel}>Estudios</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            { label: 'Estudios',  value: studios.length, color: '#efff42' },
            { label: 'Visitas',   value: studioViews,    color: 'rgba(255,255,255,0.7)' },
            { label: 'Clicks IG', value: studioIG,       color: '#c084fc' },
            { label: 'Clicks WA', value: studioWA,       color: '#4ade80' },
          ] as const).map(item => (
            <div key={item.label} className="p-4" style={card}>
              <p className="font-bold" style={{ fontSize: 28, color: item.color, lineHeight: 1 }}>{fmtN(item.value)}</p>
              <p className="mt-1.5" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{item.label}</p>
            </div>
          ))}
        </div>
        {studioWeb > 0 && (
          <div className="mt-3 px-4 py-3 flex items-center justify-between" style={{ ...card, borderRadius: 10 }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Clicks Web</p>
            <p className="font-bold" style={{ fontSize: 16, color: '#60a5fa' }}>{fmtN(studioWeb)}</p>
          </div>
        )}
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
        <p style={sectionLabel}>Visitantes únicos — últimos 30 días <span style={{ fontWeight: 400, opacity: 0.5 }}>· 21 hs ARG</span></p>
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
                <div style={{ position: 'relative' }} onMouseLeave={() => setVisitHover(null)}>
                  {visitHover && (
                    <div style={{
                      position: 'absolute',
                      left: `clamp(0px, calc(${(visitHover.x / W) * 100}% - 38px), calc(100% - 76px))`,
                      top: -36,
                      background: '#1a1a1a',
                      border: '1px solid rgba(239,255,66,0.3)',
                      borderRadius: 8,
                      padding: '4px 10px',
                      pointerEvents: 'none',
                      zIndex: 10,
                      whiteSpace: 'nowrap',
                    }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#efff42', lineHeight: 1.3 }}>{visitHover.count}</p>
                      <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{visitHover.date.slice(5).replace('-', '/')}</p>
                    </div>
                  )}
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
                    {pts.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={p.count > 0 ? '#efff42' : 'transparent'} />
                    ))}
                    {/* hit areas invisibles para hover */}
                    {pts.map((p, i) => (
                      <rect key={`h${i}`}
                        x={p.x - (W / visits.length / 2)} y={0}
                        width={W / visits.length} height={H}
                        fill="transparent"
                        style={{ cursor: 'crosshair' }}
                        onMouseEnter={() => setVisitHover(p)}
                      />
                    ))}
                  </svg>
                </div>
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
            : (showAllArtistCountries ? topCountries : topCountries.slice(0, TOP)).map(([country, count]) => {
              const pct = Math.round((count / artists.length) * 100)
              return (
                <div key={country} className="flex items-center gap-3">
                  <div style={{ width: 130, fontSize: 12, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0, fontWeight: 600 }}>
                    {country}
                  </div>
                  <div className="flex-1 rounded-full overflow-hidden" style={{ height: 7, background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full rounded-full" style={{ width: `${(count / maxCountry) * 100}%`, background: '#efff42' }} />
                  </div>
                  <div style={{ width: 38, textAlign: 'right', fontSize: 11, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>{pct}%</div>
                  <div style={{ width: 22, textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#efff42', flexShrink: 0 }}>{count}</div>
                </div>
              )
            })
          }
          {topCountries.length > TOP && (
            <button onClick={() => setShowAllArtistCountries(v => !v)} className="mt-1 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
              {showAllArtistCountries ? '▲ Ver menos' : `▼ Ver más (${topCountries.length - TOP} más)`}
            </button>
          )}
        </div>
      </div>

      <div>
        <p style={sectionLabel}>Tatuadores por ciudad</p>
        <div className="p-5 flex flex-col gap-3" style={card}>
          {topCities.length === 0
            ? <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>Sin datos</p>
            : (showAllArtistCities ? topCities : topCities.slice(0, TOP)).map(([city, count]) => (
              <div key={city} className="flex items-center gap-3">
                <div style={{ width: 150, fontSize: 12, color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0 }}>
                  {city}
                </div>
                <div className="flex-1 rounded-full overflow-hidden" style={{ height: 5, background: 'rgba(255,255,255,0.05)' }}>
                  <div className="h-full rounded-full" style={{ width: `${(count / maxCity) * 100}%`, background: '#efff42' }} />
                </div>
                <div style={{ width: 22, textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#efff42', flexShrink: 0 }}>{count}</div>
              </div>
            ))
          }
          {topCities.length > TOP && (
            <button onClick={() => setShowAllArtistCities(v => !v)} className="mt-1 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
              {showAllArtistCities ? '▲ Ver menos' : `▼ Ver más (${topCities.length - TOP} más)`}
            </button>
          )}
        </div>
      </div>

      {/* ── Installs PWA ── */}
      <div>
        <p style={sectionLabel}>Instalaciones de la app</p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {([
            { label: 'Total', value: installs.total, color: '#60a5fa' },
            { label: 'iOS',   value: installs.byPlatform.ios,     color: '#c084fc' },
            { label: 'Android', value: installs.byPlatform.android, color: '#4ade80' },
          ] as const).map(item => (
            <div key={item.label} className="p-4" style={card}>
              <p className="font-bold" style={{ fontSize: 24, color: item.color, lineHeight: 1 }}>{fmtN(item.value)}</p>
              <p className="mt-1.5" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{item.label}</p>
            </div>
          ))}
        </div>
        <div className="p-5" style={card}>
          {installs.days.every(d => d.count === 0) ? (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>Sin instalaciones en los últimos 30 días</p>
          ) : (() => {
            const max = Math.max(...installs.days.map(d => d.count), 1)
            const total30 = installs.days.reduce((s, d) => s + d.count, 0)
            const W = 300, H = 72, PX = 8, PY = 10
            const cW = W - PX * 2, cH = H - PY * 2
            const pts = installs.days.map((d, i) => ({
              x: PX + (i / (installs.days.length - 1)) * cW,
              y: PY + cH - (d.count / max) * cH,
              count: d.count,
            }))
            const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
            const area = `${line} L${pts[pts.length-1].x.toFixed(1)},${H} L${pts[0].x.toFixed(1)},${H} Z`
            return (
              <>
                <div className="flex items-end gap-5 mb-4">
                  <div>
                    <p className="font-bold" style={{ fontSize: 26, color: '#60a5fa', lineHeight: 1 }}>{installs.days[installs.days.length - 1]?.count ?? 0}</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>hoy</p>
                  </div>
                  <div>
                    <p className="font-bold" style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', lineHeight: 1 }}>{total30}</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>últimos 30 días</p>
                  </div>
                </div>
                <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: 72, display: 'block' }}>
                  <defs>
                    <linearGradient id="ig" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.01" />
                    </linearGradient>
                  </defs>
                  <path d={area} fill="url(#ig)" />
                  <path d={line} fill="none" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  {pts.filter(p => p.count > 0).map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#60a5fa" />
                  ))}
                </svg>
                <div className="flex justify-between mt-2" style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)' }}>
                  <span>{installs.days[0]?.date.slice(5).replace('-', '/')}</span>
                  <span>{installs.days[installs.days.length - 1]?.date.slice(5).replace('-', '/')}</span>
                </div>
              </>
            )
          })()}
        </div>
      </div>

      {/* ── Búsquedas ── */}
      {(searchStats.countries.length > 0 || searchStats.cities.length > 0 || searchStats.styles.length > 0) && (
        <div>
          <p style={sectionLabel}>Búsquedas realizadas</p>
          <div className="flex flex-col gap-4">

            {searchStats.countries.length > 0 && (() => {
              const list = showAllCountries ? searchStats.countries : searchStats.countries.slice(0, TOP)
              const maxC = searchStats.countries[0].count
              return (
                <div className="p-5" style={card}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Países buscados</p>
                  <div className="flex flex-col gap-3">
                    {list.map(r => (
                      <div key={r.value} className="flex items-center gap-3">
                        <div style={{ width: 130, fontSize: 12, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0, fontWeight: 600 }}>{cap(r.value)}</div>
                        <div className="flex-1 rounded-full overflow-hidden" style={{ height: 7, background: 'rgba(255,255,255,0.05)' }}>
                          <div className="h-full rounded-full" style={{ width: `${(r.count / maxC) * 100}%`, background: '#34d399' }} />
                        </div>
                        <div style={{ width: 34, textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#34d399', flexShrink: 0 }}>{r.count}</div>
                      </div>
                    ))}
                  </div>
                  {searchStats.countries.length > TOP && (
                    <button onClick={() => setShowAllCountries(v => !v)} className="mt-4 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      {showAllCountries ? '▲ Ver menos' : `▼ Ver más (${searchStats.countries.length - TOP} más)`}
                    </button>
                  )}
                </div>
              )
            })()}

            {searchStats.cities.length > 0 && (() => {
              const list = showAllCities ? searchStats.cities : searchStats.cities.slice(0, TOP)
              const maxC = searchStats.cities[0].count
              return (
                <div className="p-5" style={card}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Ciudades buscadas</p>
                  <div className="flex flex-col gap-3">
                    {list.map(r => (
                      <div key={r.value} className="flex items-center gap-3">
                        <div style={{ width: 130, fontSize: 12, color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0 }}>{cap(r.value)}</div>
                        <div className="flex-1 rounded-full overflow-hidden" style={{ height: 5, background: 'rgba(255,255,255,0.05)' }}>
                          <div className="h-full rounded-full" style={{ width: `${(r.count / maxC) * 100}%`, background: '#34d399' }} />
                        </div>
                        <div style={{ width: 34, textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#34d399', flexShrink: 0 }}>{r.count}</div>
                      </div>
                    ))}
                  </div>
                  {searchStats.cities.length > TOP && (
                    <button onClick={() => setShowAllCities(v => !v)} className="mt-4 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      {showAllCities ? '▲ Ver menos' : `▼ Ver más (${searchStats.cities.length - TOP} más)`}
                    </button>
                  )}
                </div>
              )
            })()}

            {searchStats.styles.length > 0 && (() => {
              const list = showAllStyles ? searchStats.styles : searchStats.styles.slice(0, TOP)
              const maxS = searchStats.styles[0].count
              return (
                <div className="p-5" style={card}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Estilos buscados</p>
                  <div className="flex flex-col gap-3">
                    {list.map(r => (
                      <div key={r.value} className="flex items-center gap-3">
                        <div style={{ width: 130, fontSize: 12, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0, fontWeight: 600 }}>{cap(r.value)}</div>
                        <div className="flex-1 rounded-full overflow-hidden" style={{ height: 5, background: 'rgba(255,255,255,0.05)' }}>
                          <div className="h-full rounded-full" style={{ width: `${(r.count / maxS) * 100}%`, background: '#a78bfa' }} />
                        </div>
                        <div style={{ width: 34, textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#a78bfa', flexShrink: 0 }}>{r.count}</div>
                      </div>
                    ))}
                  </div>
                  {searchStats.styles.length > TOP && (
                    <button onClick={() => setShowAllStyles(v => !v)} className="mt-4 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      {showAllStyles ? '▲ Ver menos' : `▼ Ver más (${searchStats.styles.length - TOP} más)`}
                    </button>
                  )}
                </div>
              )
            })()}

          </div>
        </div>
      )}

      {/* Botones de la app */}
      {(appEventCounts['insumos_open'] || appEventCounts['eventos_open']) ? (
        <div>
          <p style={sectionLabel}>Botones de la app</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Insumos', key: 'insumos_open', color: '#efff42' },
              { label: 'Eventos', key: 'eventos_open', color: '#efff42' },
            ].map(({ label, key, color }) => (
              <div key={key} className="p-5 flex flex-col gap-1" style={card}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</p>
                <p style={{ fontSize: 32, fontWeight: 900, color, lineHeight: 1 }}>{appEventCounts[key] ?? 0}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>aperturas totales</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

    </div>
  )
}

export default function AdminPage() {
  const [pass, setPass]       = useState('')
  const [pin, setPin]         = useState('')
  const [auth, setAuth]       = useState(false)
  const [tab, setTab]         = useState<'artistas' | 'ads' | 'stats' | 'pendientes' | 'config' | 'contenido' | 'agregar' | 'sponsors2' | 'convenciones' | 'estudios' | 'idiomas'>('artistas')
  const [artists, setArtists]       = useState<Artist[]>([])
  const [artistsTotal, setArtistsTotal] = useState(0)
  const [artistsOffset, setArtistsOffset] = useState(0)
  const [loadingMoreArtists, setLoadingMoreArtists] = useState(false)
  const ARTISTS_PAGE = 10
  const [statsArtists, setStatsArtists] = useState<Artist[]>([])
  const [loadingStats, setLoadingStats] = useState(false)
  const [loadingPending, setLoadingPending] = useState(false)
  const [copiedMsg, setCopiedMsg] = useState<string | null>(null)
  const [loadingArtists, setLoadingArtists] = useState(false)
  const [searchStats, setSearchStats] = useState<{ countries: SearchStat[]; cities: SearchStat[]; styles: SearchStat[] }>({ countries: [], cities: [], styles: [] })
  const [appEventCounts, setAppEventCounts] = useState<Record<string, number>>({})
  const [artistSearch, setArtistSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Artist[] | null>(null)
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [ads, setAds]         = useState<Ad[]>([])
  const [editingAd, setEditingAd] = useState<{ id: string; city: string; country: string; expires_at: string } | null>(null)
  const [savingAdEdit, setSavingAdEdit] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [deleting, setDeleting]   = useState<string | null>(null)
  const [visits, setVisits]       = useState<DayVisit[]>([])
  const [installs, setInstalls]   = useState<InstallStats>({ days: [], byPlatform: { ios: 0, android: 0, other: 0 }, total: 0 })
  const [moderation, setModeration] = useState(false)
  const [savingMod, setSavingMod]   = useState(false)
  const [showCount, setShowCount]   = useState(false)
  const [savingShowCount, setSavingShowCount] = useState(false)
  const [galleryEnabled, setGalleryEnabled]             = useState(false)
  const [savingGallery, setSavingGallery]               = useState(false)
  const [eventsCountryFilter, setEventsCountryFilter]   = useState(false)
  const [savingEventsCountry, setSavingEventsCountry]   = useState(false)
  const [registrationOpen, setRegistrationOpen]         = useState(true)
  const [savingRegistration, setSavingRegistration]     = useState(false)
  const [verifyIG, setVerifyIG]                         = useState('')
  const [verifyWA, setVerifyWA]                         = useState('')
  const [savingVerify, setSavingVerify]                 = useState(false)
  const [wordSearch, setWordSearch]                     = useState('')
  const [storageR2, setStorageR2]           = useState(false)
  const [savingStorage, setSavingStorage]   = useState(false)
  const [r2Available, setR2Available]       = useState(false)
  const [adminStyles, setAdminStyles] = useState<string[]>(DEFAULT_STYLES)
  const [stylesInput, setStylesInput] = useState('')
  const [savingStyles, setSavingStyles] = useState(false)
  const [contentCards, setContentCards] = useState<ContentCard[]>([])
  const [savingContent, setSavingContent] = useState(false)
  const [secretCardAdmin, setSecretCardAdmin] = useState({ active: false, image_url: '', back_image_url: '', artist_name: '', city: '', link: '', caption: '', number: '' })
  const [secretCardFile, setSecretCardFile] = useState<File | null>(null)
  const [secretCardPreview, setSecretCardPreview] = useState<string | null>(null)
  const [secretCardBackFile, setSecretCardBackFile] = useState<File | null>(null)
  const [secretCardBackPreview, setSecretCardBackPreview] = useState<string | null>(null)
  const [savingSecretCard, setSavingSecretCard] = useState(false)
  const [contentLangsAll, setContentLangsAll] = useState<{ code: string; name: string; flag: string }[]>([])
  const [cardsByLang, setCardsByLang] = useState<Record<string, ContentCard[]>>({ es: [] })
  const [selectedCardsLang, setSelectedCardsLang] = useState('es')
  const [sponsors, setSponsors]           = useState<SponsorAdmin[]>([])
  const [bannerActive, setBannerActive]   = useState(false)
  const [savingBanner, setSavingBanner]   = useState(false)
  const [sponsorForm, setSponsorForm]     = useState({ name: '', link: '', country: '', starts_at: '', expires_at: '', keep_color: false })
  const [sponsorLogo, setSponsorLogo]     = useState<File | null>(null)
  const [sponsorLogoPreview, setSponsorLogoPreview] = useState<string | null>(null)
  const [savingSponsors, setSavingSponsors] = useState(false)
  const [sponsorError, setSponsorError]   = useState('')
  const [sponsorsV2, setSponsorsV2]           = useState<SponsorV2Admin[]>([])
  const [bannerV2Active, setBannerV2Active]   = useState(false)
  const [savingBannerV2, setSavingBannerV2]   = useState(false)
  const [sponsorV2Form, setSponsorV2Form]     = useState({ name: '', description: '', link: '', whatsapp: '', level: 'global', city: '', country: '', starts_at: '', expires_at: '', keep_color: false, notes: '', detail_logo_mode: 'white', logo_scale: 100 })
  const [sponsorV2Logo, setSponsorV2Logo]     = useState<File | null>(null)
  const [sponsorV2LogoPreview, setSponsorV2LogoPreview] = useState<string | null>(null)
  const [sponsorV2Bg, setSponsorV2Bg]         = useState<File | null>(null)
  const [sponsorV2BgPreview, setSponsorV2BgPreview] = useState<string | null>(null)
  const [sponsorV2DetailLogo, setSponsorV2DetailLogo] = useState<File | null>(null)
  const [sponsorV2DetailLogoPreview, setSponsorV2DetailLogoPreview] = useState<string | null>(null)
  const [savingSponsorsV2, setSavingSponsorsV2] = useState(false)
  const [sponsorV2Error, setSponsorV2Error]   = useState('')
  const [editingV2, setEditingV2]             = useState<string | null>(null)

  // ── IDIOMAS ──────────────────────────────────────────────────────────────
  type LangRow = { code: string; name: string; flag: string; active: boolean }
  const [langs, setLangs]                   = useState<LangRow[]>([])
  const [idiomaLang, setIdiomaLang]         = useState<string | null>(null)
  const [idiomaEsKeys, setIdiomaEsKeys]     = useState<{ section: string; key: string; value: string }[]>([])
  const [idiomaEdits, setIdiomaEdits]       = useState<Record<string, Record<string, string>>>({})
  const [idiomaOpen, setIdiomaOpen]         = useState<Set<string>>(new Set(['inicio']))
  const [idiomaSaving, setIdiomaSaving]     = useState<string | null>(null)
  const [addLangOpen, setAddLangOpen]       = useState(false)
  const [newLang, setNewLang]               = useState({ code: '', name: '', flag: '' })
  const [addingLang, setAddingLang]         = useState(false)
  const [editingLangCode, setEditingLangCode] = useState<string | null>(null)
  const [editingLangVals, setEditingLangVals] = useState({ code: '', name: '', flag: '' })
  const [savingLangMeta, setSavingLangMeta]   = useState(false)

  const TRANS_SECTIONS = [
    { key: 'inicio',     label: 'Inicio — Feed principal' },
    { key: 'agregar',    label: '+tatuador/a — Formulario de registro' },
    { key: 'global',     label: 'Global — Textos comunes' },
    { key: 'terminos',   label: 'Términos y condiciones' },
    { key: 'privacidad', label: 'Política de privacidad' },
    { key: 'artista',    label: 'Artista — Perfil y modal' },
    { key: 'historia',   label: 'Historia — Preguntas del perfil' },
    { key: 'editar',     label: 'Editar — Panel de edición tatuador' },
    { key: 'estudio',    label: 'Estudio — Panel del estudio' },
    { key: 'eventos',    label: 'Eventos — Flash days y convenciones' },
    { key: 'insumos',    label: 'Insumos — Proveedores' },
  ]

  const openLang = async (code: string) => {
    setIdiomaLang(code)
    const [r1, r2] = await Promise.all([
      fetch('/api/admin/translations?lang=es').then(r => r.json()),
      code !== 'es' ? fetch(`/api/admin/translations?lang=${code}`).then(r => r.json()) : Promise.resolve({ translations: [] }),
    ])
    const esKeys: { section: string; key: string; value: string }[] = r1.translations ?? []
    setIdiomaEsKeys(esKeys)
    const base = code === 'es' ? esKeys : (r2.translations ?? [])
    const map: Record<string, Record<string, string>> = {}
    for (const row of base) {
      if (!map[row.section]) map[row.section] = {}
      map[row.section][row.key] = row.value
    }
    setIdiomaEdits(map)
  }

  const saveIdiomaSection = async (section: string) => {
    if (!idiomaLang) return
    setIdiomaSaving(section)
    const esSection = idiomaEsKeys.filter(k => k.section === section)
    const rows = esSection.map(k => ({
      language_code: idiomaLang,
      section: k.section,
      key: k.key,
      value: idiomaEdits[section]?.[k.key] ?? '',
    }))
    await fetch('/api/admin/translations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows),
    })
    setIdiomaSaving(null)
  }
  const [previewV2, setPreviewV2]             = useState<SponsorV2Admin | null>(null)
  const [statsV2Sp, setStatsV2Sp]             = useState<SponsorV2Admin | null>(null)
  const [statsV2Data, setStatsV2Data]         = useState<StatsV2Data | null>(null)
  const [statsV2Loading, setStatsV2Loading]   = useState(false)
  const [editV2Form, setEditV2Form]           = useState({ name: '', description: '', link: '', whatsapp: '', level: 'global', city: '', country: '', keep_color: false as boolean | null, starts_at: '', expires_at: '', notes: '', detail_logo_mode: 'white', logo_scale: 100 })
  const [editV2BgFile, setEditV2BgFile]       = useState<File | null>(null)
  const [editV2BgPreview, setEditV2BgPreview] = useState<string | null>(null)
  const [editV2DetailLogoFile, setEditV2DetailLogoFile] = useState<File | null>(null)
  const [editV2DetailLogoPreview, setEditV2DetailLogoPreview] = useState<string | null>(null)
  const [savingEditV2, setSavingEditV2]       = useState(false)
  const [conventions, setConventions]         = useState<Convention[]>([])
  const [convForm, setConvForm]               = useState({ name: '', link: '', expires_at: '', country: '' })
  const [convImage, setConvImage]             = useState<File | null>(null)
  const [convImagePreview, setConvImagePreview] = useState<string | null>(null)
  const [savingConv, setSavingConv]           = useState(false)
  const [convError, setConvError]             = useState('')
  const [deletingConv, setDeletingConv]       = useState<string | null>(null)
  const [menuOpen, setMenuOpen]     = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Estudios
  type AdminStudioArtist = { artist_id: string; artists: { id: string; name: string; instagram: string | null } | null }
  type AdminStudio = { id: string; name: string; slug: string; city: string | null; country: string | null; visible: boolean; edit_key: string; created_at: string; expires_at: string | null; profile_views: number; instagram_clicks: number; whatsapp_clicks: number; website_clicks: number; studio_artists?: AdminStudioArtist[] }
  const [adminStudios, setAdminStudios]       = useState<AdminStudio[]>([])
  const [studioSearch, setStudioSearch]       = useState('')
  const [studioForm, setStudioForm]           = useState({ name: '', slug: '', city: '', country: '', description: '', instagram: '', whatsapp: '', website: '', expires_at: '' })
  const [studioLogo, setStudioLogo]           = useState<File | null>(null)
  const [studioLogoPreview, setStudioLogoPreview] = useState<string | null>(null)
  const [savingStudio, setSavingStudio]       = useState(false)
  const [studioError, setStudioError]         = useState('')
  const [studioCreated, setStudioCreated]     = useState<{ name: string; slug: string; edit_key: string } | null>(null)
  const [keyCopied, setKeyCopied]             = useState(false)
  const [studioIgStatus, setStudioIgStatus]   = useState<'idle'|'checking'|'ok'|'taken'>('idle')
  const studioIgTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    const handle = studioForm.instagram.trim().replace('@', '')
    if (!handle) { setStudioIgStatus('idle'); return }
    setStudioIgStatus('checking')
    clearTimeout(studioIgTimer.current)
    studioIgTimer.current = setTimeout(async () => {
      const r = await fetch(`/api/check-ig?handle=${encodeURIComponent(handle)}`)
      const d = await r.json()
      setStudioIgStatus(d.available ? 'ok' : 'taken')
    }, 600)
    return () => clearTimeout(studioIgTimer.current)
  }, [studioForm.instagram])

  // Ad form
  const [adForm, setAdForm] = useState({ title: '', link: '', city: '', country: '', instagram: '', whatsapp: '', website: '', expires_at: '' })
  const [adPhoto, setAdPhoto] = useState<File | null>(null)
  const [adPreview, setAdPreview] = useState<string | null>(null)
  const [savingAd, setSavingAd] = useState(false)
  const [adError, setAdError] = useState('')

  const login = (e: { preventDefault: () => void }) => {
    e.preventDefault()
    if (pin.length < 3) { setError('Contraseña incorrecta'); return }
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
      fetch(`/api/admin/artists?limit=10&offset=0`, { headers: H(p) }).then(r => r.json()),
      fetch('/api/admin/ads', { headers: H(p) }).then(r => r.json()),
      fetch('/api/admin/stats/visits', { headers: H(p) }).then(r => r.json()),
      fetch('/api/admin/settings', { headers: H(p) }).then(r => r.json()),
      fetch('/api/admin/stats/installs', { headers: H(p) }).then(r => r.json()),
      fetch('/api/admin/sponsors', { headers: H(p) }).then(r => r.json()),
      fetch('/api/admin/sponsors-v2', { headers: H(p) }).then(r => r.json()),
      fetch('/api/admin/conventions', { headers: H(p) }).then(r => r.json()),
      fetch('/api/admin/studios', { headers: H(p) }).then(r => r.json()),
    ]).then(([a, b, v, cfg, ins, sp, sp2, conv, stu]) => {
      if (a.status === 'fulfilled') {
        setArtists(a.value.artists || [])
        setArtistsTotal(a.value.total ?? 0)
        setArtistsOffset(ARTISTS_PAGE)
      }
      if (b.status === 'fulfilled') setAds(b.value.ads || [])
      if (v.status === 'fulfilled') setVisits(v.value.days || [])
      if (ins.status === 'fulfilled' && ins.value.days) setInstalls(ins.value)
      if (sp.status === 'fulfilled') {
        setSponsors(sp.value.sponsors || [])
        setBannerActive(sp.value.banner_active === true)
      }
      if (sp2.status === 'fulfilled') {
        setSponsorsV2(sp2.value.sponsors || [])
        setBannerV2Active(sp2.value.banner_active === true)
      }
      if (conv.status === 'fulfilled') setConventions(conv.value.conventions || [])
      if (stu.status === 'fulfilled') setAdminStudios(stu.value.studios || [])
      if (cfg.status === 'fulfilled') {
        setModeration(cfg.value.settings?.moderation === true)
        setShowCount(cfg.value.settings?.show_count === true)
        setGalleryEnabled(cfg.value.settings?.artist_gallery_enabled === true)
        setEventsCountryFilter(cfg.value.settings?.events_country_filter === true)
        setRegistrationOpen(cfg.value.settings?.registration_open !== false)
        setVerifyIG(cfg.value.settings?.verification_instagram || '')
        setVerifyWA(cfg.value.settings?.verification_whatsapp || '')
        setStorageR2(cfg.value.settings?.storage_provider === 'r2')
        setR2Available(cfg.value.r2_available === true)
        if (Array.isArray(cfg.value.settings?.styles) && cfg.value.settings.styles.length > 0)
          setAdminStyles(cfg.value.settings.styles)
        if (cfg.value.settings) {
          const byLang: Record<string, ContentCard[]> = {}
          Object.keys(cfg.value.settings).forEach(k => {
            if (k === 'content_cards' && Array.isArray(cfg.value.settings[k]))
              byLang['es'] = cfg.value.settings[k]
            else if (k.startsWith('content_cards_') && Array.isArray(cfg.value.settings[k]))
              byLang[k.replace('content_cards_', '')] = cfg.value.settings[k]
          })
          setCardsByLang(byLang)
          if (cfg.value.settings.secret_card) {
            setSecretCardAdmin(cfg.value.settings.secret_card)
          }
        }
      }
      setLoading(false)
    })
  }

  useEffect(() => {
    if (tab !== 'idiomas' || !auth) return
    fetch('/api/admin/languages').then(r => r.json()).then(d => setLangs(d.languages ?? [])).catch(() => {})
  }, [tab, auth])

  useEffect(() => {
    if (tab !== 'contenido' || !auth) return
    fetch('/api/admin/languages').then(r => r.json()).then(d => setContentLangsAll(d.languages ?? [])).catch(() => {})
  }, [tab, auth])

  useEffect(() => {
    setContentCards(cardsByLang[selectedCardsLang] ?? [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCardsLang, cardsByLang])

  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    if (!auth) return
    clearTimeout(searchTimer.current)
    if (!artistSearch.trim()) { setSearchResults(null); setLoadingSearch(false); return }
    setLoadingSearch(true)
    searchTimer.current = setTimeout(async () => {
      const r = await fetch(`/api/admin/artists?search=${encodeURIComponent(artistSearch.trim())}&limit=50&offset=0`, { headers: H(pass) })
      const d = await r.json()
      setSearchResults(d.artists || [])
      setLoadingSearch(false)
    }, 400)
    return () => clearTimeout(searchTimer.current)
  }, [artistSearch, auth, pass])

  const refreshArtists = async () => {
    setLoadingArtists(true)
    const r = await fetch(`/api/admin/artists?limit=${ARTISTS_PAGE}&offset=0`, { headers: H(pass) }).then(res => res.json()).catch(() => null)
    if (r?.artists) {
      setArtists(prev => [...prev.filter(a => a.status === 'pending'), ...r.artists])
      setArtistsTotal(r.total ?? 0)
      setArtistsOffset(r.artists.length)
    }
    setLoadingArtists(false)
  }

  const refreshPending = async (p: string) => {
    setLoadingPending(true)
    const r = await fetch('/api/admin/artists?status=pending&limit=1000&offset=0', { headers: H(p) }).then(res => res.json()).catch(() => null)
    if (r?.artists) {
      setArtists(prev => [...prev.filter(a => a.status !== 'pending'), ...r.artists])
    }
    setLoadingPending(false)
  }

  const loadStatsArtists = async (p: string, force = false) => {
    if (!force && (statsArtists.length > 0 || loadingStats)) return
    setLoadingStats(true)
    const [r, sr, er] = await Promise.all([
      fetch('/api/admin/artists?limit=10000&offset=0', { headers: H(p) }),
      fetch('/api/admin/search-stats', { headers: H(p) }),
      fetch('/api/admin/app-events', { headers: H(p) }),
    ])
    const [d, sd, ed] = await Promise.all([r.json(), sr.json(), er.json()])
    setStatsArtists(d.artists || [])
    setSearchStats({ countries: sd.countries || [], cities: sd.cities || [], styles: sd.styles || [] })
    setAppEventCounts(ed.counts || {})
    setLoadingStats(false)
  }

  const loadMoreArtists = async () => {
    setLoadingMoreArtists(true)
    try {
      const r = await fetch(`/api/admin/artists?limit=${ARTISTS_PAGE}&offset=${artistsOffset}`, { headers: H(pass) })
      const d = await r.json()
      setArtists(prev => [...prev, ...(d.artists || [])])
      setArtistsTotal(d.total ?? 0)
      setArtistsOffset(prev => prev + (d.artists?.length ?? 0))
    } finally {
      setLoadingMoreArtists(false)
    }
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
    const r = await fetch(`/api/admin/artists/${id}`, {
      method: 'PATCH',
      headers: { ...H(pass), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    })
    if (r.ok) patchArtistInLists(id, { status: 'active' })
  }

  const rejectArtist = async (id: string) => {
    if (!confirm('¿Rechazar y eliminar este perfil?')) return
    setDeleting(id)
    const r = await fetch(`/api/admin/artists/${id}`, { method: 'DELETE', headers: H(pass) })
    if (r.ok) removeArtistFromLists(id)
    setDeleting(null)
  }


  const patchArtistInLists = (id: string, changes: Partial<Artist>) => {
    const apply = (arr: Artist[]) => arr.map(a => a.id === id ? { ...a, ...changes } : a)
    setArtists(apply)
    setSearchResults(prev => prev ? apply(prev) : prev)
  }
  const removeArtistFromLists = (id: string) => {
    setArtists(prev => prev.filter(a => a.id !== id))
    setSearchResults(prev => prev ? prev.filter(a => a.id !== id) : prev)
  }

  const deleteArtist = async (id: string) => {
    if (!confirm('¿Borrar este tatuador?')) return
    setDeleting(id)
    const r = await fetch(`/api/admin/artists/${id}`, { method: 'DELETE', headers: H(pass) })
    if (r.ok) {
      removeArtistFromLists(id)
      setArtistsTotal(prev => Math.max(0, prev - 1))
    }
    setDeleting(null)
  }

  const updateArtistKey = async (id: string, key: string) => {
    const trimmed = key.trim().toUpperCase()
    if (!trimmed) return
    const r = await fetch(`/api/admin/artists/${id}`, {
      method: 'PATCH',
      headers: { ...H(pass), 'Content-Type': 'application/json' },
      body: JSON.stringify({ edit_key: trimmed }),
    })
    if (!r.ok) {
      const d = await r.json().catch(() => ({}))
      alert(`Error al guardar clave: ${d.error || r.status}`)
      return
    }
    patchArtistInLists(id, { edit_key: trimmed })
  }

  const toggleVisible = async (id: string, visible: boolean) => {
    await fetch(`/api/admin/artists/${id}`, {
      method: 'PATCH',
      headers: { ...H(pass), 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible }),
    })
    patchArtistInLists(id, { visible })
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

  const toggleAdGlobal = async (id: string, show_global: boolean) => {
    await fetch(`/api/admin/ads/${id}`, { method: 'PATCH', headers: { ...H(pass), 'Content-Type': 'application/json' }, body: JSON.stringify({ show_global: !show_global }) })
    setAds(prev => prev.map(a => a.id === id ? { ...a, show_global: !show_global } : a))
  }

  const saveAdLocation = async () => {
    if (!editingAd) return
    setSavingAdEdit(true)
    const body: Record<string, string | null> = {
      city: editingAd.city.trim() || null,
      country: editingAd.country.trim() || null,
      expires_at: editingAd.expires_at ? new Date(editingAd.expires_at).toISOString() : null,
    }
    const r = await fetch(`/api/admin/ads/${editingAd.id}`, {
      method: 'PATCH',
      headers: { ...H(pass), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const d = await r.json()
    if (d.ad) setAds(prev => prev.map(a => a.id === editingAd.id ? { ...a, city: d.ad.city, country: d.ad.country, expires_at: d.ad.expires_at } : a))
    setEditingAd(null)
    setSavingAdEdit(false)
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
    if (!adForm.title.trim()) { setAdError('Completá el título'); return }
    if (!adForm.city.trim()) { setAdError('La ciudad es obligatoria'); return }
    if (!adForm.country.trim()) { setAdError('El país es obligatorio'); return }
    setSavingAd(true)
    try {
      const fd = new FormData()
      fd.append('photo', adPhoto)
      fd.append('title', adForm.title.trim())
      fd.append('link', adForm.link.trim())
      fd.append('city', adForm.city.trim())
      fd.append('country', adForm.country.trim())
      fd.append('instagram', adForm.instagram.trim())
      fd.append('whatsapp', adForm.whatsapp.trim())
      fd.append('website', adForm.website.trim())
      if (adForm.expires_at) fd.append('expires_at', new Date(adForm.expires_at).toISOString())
      const r = await fetch('/api/admin/ads', { method: 'POST', headers: H(pass), body: fd })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Error')
      setAds(prev => [d.ad, ...prev])
      setAdForm({ title: '', link: '', city: '', country: '', instagram: '', whatsapp: '', website: '', expires_at: '' }); setAdPhoto(null); setAdPreview(null)
    } catch (err: unknown) {
      setAdError(err instanceof Error ? err.message : 'Error')
    } finally { setSavingAd(false) }
  }

  const handleConvImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setConvImage(file)
    setConvImagePreview(URL.createObjectURL(file))
  }

  const saveConv = async (e: { preventDefault: () => void }) => {
    e.preventDefault(); setConvError('')
    if (!convImage) { setConvError('Agregá una imagen'); return }
    setSavingConv(true)
    try {
      const fd = new FormData()
      fd.append('image', convImage)
      if (convForm.name.trim()) fd.append('name', convForm.name.trim())
      if (convForm.link.trim()) fd.append('link', convForm.link.trim())
      if (convForm.country.trim()) fd.append('country', convForm.country.trim())
      if (convForm.expires_at) fd.append('expires_at', new Date(convForm.expires_at).toISOString())
      const r = await fetch('/api/admin/conventions', { method: 'POST', headers: H(pass), body: fd })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Error')
      setConventions(prev => [d.convention, ...prev])
      setConvForm({ name: '', link: '', expires_at: '', country: '' }); setConvImage(null); setConvImagePreview(null)
    } catch (err: unknown) {
      setConvError(err instanceof Error ? err.message : 'Error')
    } finally { setSavingConv(false) }
  }

  const toggleConv = async (id: string, active: boolean) => {
    const r = await fetch(`/api/admin/conventions/${id}`, { method: 'PATCH', headers: { ...H(pass), 'Content-Type': 'application/json' }, body: JSON.stringify({ active }) })
    const d = await r.json()
    if (d.convention) setConventions(prev => prev.map(c => c.id === id ? { ...c, active: d.convention.active } : c))
  }

  const deleteConv = async (id: string) => {
    setDeletingConv(id)
    await fetch(`/api/admin/conventions/${id}`, { method: 'DELETE', headers: H(pass) })
    setConventions(prev => prev.filter(c => c.id !== id))
    setDeletingConv(null)
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
        <input placeholder="contraseña" value={pin}
          onChange={e => setPin(e.target.value)}
          className="py-2.5 px-4 text-sm text-white outline-none rounded-lg"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button type="submit" className="py-2.5 font-bold text-sm rounded-lg"
          style={{ background: '#efff42', color: '#000' }}>Entrar</button>
      </form>
    </main>
  )

  const loadStatsV2 = async (sp: SponsorV2Admin) => {
    setStatsV2Sp(sp)
    setStatsV2Data(null)
    setStatsV2Loading(true)
    try {
      const res = await fetch(`/api/admin/sponsors-v2/${sp.id}/stats`, { headers: H(pass) })
      const data: StatsV2Data = await res.json()
      setStatsV2Data(data)
    } finally {
      setStatsV2Loading(false)
    }
  }

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
              { key: 'pendientes', label: pendingCount > 0 ? `Pendientes (${pendingCount})` : 'Pendientes', alert: pendingCount > 0 },
              { key: 'config',     label: 'Config' },
              { key: 'contenido',  label: 'Contenido' },
              { key: 'sponsors2',    label: `Sponsors (${sponsorsV2.length})` },
              { key: 'convenciones', label: `Convenciones (${conventions.length})` },
              { key: 'estudios',     label: `Estudios (${adminStudios.length})` },
              { key: 'agregar',      label: '+ Agregar' },
              { key: 'idiomas',      label: 'Idiomas' },
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
                        onClick={() => { setTab(t.key); setMenuOpen(false); if (t.key === 'stats') loadStatsArtists(pass) }}
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

          // ── ARTISTAS ──────────���─────────────────────────────────────────────
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>Tatuadores ({artistsTotal})</p>
              <button
                onClick={refreshArtists}
                disabled={loadingArtists}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', color: loadingArtists ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ display: 'inline-block', animation: loadingArtists ? 'spin 1s linear infinite' : 'none' }}>↻</span>
                {loadingArtists ? 'Actualizando…' : 'Actualizar'}
              </button>
            </div>
            <div className="relative">
              <input
                value={artistSearch}
                onChange={e => setArtistSearch(e.target.value)}
                placeholder={`Buscar entre ${artistsTotal} tatuadores...`}
                className="w-full py-2 px-3 text-sm text-white outline-none rounded-xl bg-white/5 border border-white/10 focus:border-white/30 transition-colors placeholder-white/20"
              />
              {loadingSearch && (
                <span className="absolute right-3 top-2 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>buscando...</span>
              )}
              {artistSearch && !loadingSearch && (
                <button onClick={() => setArtistSearch('')}
                  className="absolute right-3 top-2 text-xs"
                  style={{ color: 'rgba(255,255,255,0.25)' }}>✕</button>
              )}
            </div>

            {searchResults !== null ? (
              <>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''} para &quot;{artistSearch}&quot;
                </p>
                <ArtistGrid artists={searchResults} deleting={deleting} onDelete={deleteArtist} onToggleVisible={toggleVisible} onUpdateKey={updateArtistKey} />
              </>
            ) : (
              <>
                <ArtistGrid artists={artists.filter(a => a.status !== 'pending')} deleting={deleting} onDelete={deleteArtist} onToggleVisible={toggleVisible} onUpdateKey={updateArtistKey} />
                {artists.length < artistsTotal && (
                  <button
                    onClick={loadMoreArtists}
                    disabled={loadingMoreArtists}
                    className="self-center px-6 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
                    {loadingMoreArtists ? 'Cargando...' : `Cargar ${Math.min(ARTISTS_PAGE, artistsTotal - artists.length)} más (${artistsTotal - artists.length} restantes)`}
                  </button>
                )}
              </>
            )}
          </div>

        ) : tab === 'stats' ? (

          // ── ESTADÍSTICAS ────────────────────────────────────────────────────
          <div>
            <div className="flex items-center justify-between mb-4">
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>Estadísticas</p>
              <button
                onClick={() => loadStatsArtists(pass, true)}
                disabled={loadingStats}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', color: loadingStats ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ display: 'inline-block', animation: loadingStats ? 'spin 1s linear infinite' : 'none' }}>↻</span>
                {loadingStats ? 'Actualizando…' : 'Actualizar'}
              </button>
            </div>
            {loadingStats
              ? <p className="text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>Cargando estadísticas...</p>
              : <StatsPanel artists={statsArtists} visits={visits} installs={installs} studios={adminStudios} searchStats={searchStats} appEventCounts={appEventCounts} />
            }
          </div>

        ) : tab === 'pendientes' ? (

          // ── PENDIENTES ───────────────────────────────────────────────────────
          (() => {
            const pending = artists.filter(a => a.status === 'pending')
            const filtered = wordSearch.trim()
              ? pending.filter(a => a.verification_word?.toLowerCase() === wordSearch.trim().toLowerCase())
              : pending
            return (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>Pendientes ({pending.length})</p>
                  <button
                    onClick={() => refreshPending(pass)}
                    disabled={loadingPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                    style={{ background: 'rgba(255,255,255,0.05)', color: loadingPending ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <span style={{ display: 'inline-block', animation: loadingPending ? 'spin 1s linear infinite' : 'none' }}>↻</span>
                    {loadingPending ? 'Actualizando…' : 'Actualizar'}
                  </button>
                </div>
                {/* Buscador por palabra */}
                <input
                  value={wordSearch}
                  onChange={e => setWordSearch(e.target.value)}
                  placeholder="Buscá por palabra de verificación..."
                  className="w-full text-sm text-white outline-none rounded-xl px-4 py-3"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
                {filtered.length === 0 ? (
                  <p className="text-sm py-8 text-center" style={{ color: 'rgba(255,255,255,0.15)' }}>
                    {wordSearch.trim() ? 'No se encontró ningún perfil con esa palabra' : 'No hay perfiles pendientes'}
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {filtered.map(a => {
                      const expired = Date.now() - new Date(a.created_at).getTime() > 60 * 60 * 1000
                      return (
                        <div key={a.id} className="rounded-xl overflow-hidden flex gap-4 p-4 items-center"
                          style={{ background: expired ? 'rgba(255,60,60,0.04)' : 'rgba(255,255,255,0.03)', border: expired ? '1px solid rgba(255,80,80,0.5)' : '1px solid rgba(255,200,0,0.2)' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={a.photo_url} alt={a.name}
                            className="rounded-lg object-cover shrink-0"
                            style={{ width: 64, height: 64 }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <p className="text-sm font-bold text-white truncate">{a.name}</p>
                                {a.pending_reason?.startsWith('ig_change') && (
                                  <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }}>
                                    cambio IG
                                  </span>
                                )}
                              </div>
                              <p className="text-xs shrink-0" style={{ color: expired ? 'rgba(255,100,100,0.6)' : 'rgba(255,255,255,0.2)' }}>
                                {new Date(a.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })} {new Date(a.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{a.city}, {a.country}</p>
                            {a.instagram && (
                              <p className="text-xs mt-0.5 truncate font-semibold" style={{ color: '#c77dff' }}>
                                {a.instagram}
                                {a.pending_reason?.startsWith('ig_change') && (
                                  <span className="font-normal ml-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                    (antes: @{a.pending_reason.split(':')[1]})
                                  </span>
                                )}
                              </p>
                            )}
                            {a.whatsapp && <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.2)' }}>{a.whatsapp}</p>}
                            {a.verification_word && (
                              <p className="text-xs mt-1 font-bold tracking-widest" style={{ color: '#efff42', letterSpacing: '0.15em' }}>
                                ✦ {a.verification_word}
                              </p>
                            )}
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
                            <button onClick={() => {
                              const msg = `Hola ${a.name}, tu perfil en flashttoo ya está activo 🎉 Si tenés colegas tatuadores que quieran sumarse: flashttoo.com/agregar`
                              navigator.clipboard.writeText(msg).then(() => {
                                setCopiedMsg(a.id)
                                setTimeout(() => setCopiedMsg(null), 2000)
                              })
                            }}
                              className="text-xs px-4 py-2 rounded-lg transition-colors"
                              style={{ background: copiedMsg === a.id ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${copiedMsg === a.id ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.1)'}`, color: copiedMsg === a.id ? '#4ade80' : 'rgba(255,255,255,0.3)' }}>
                              {copiedMsg === a.id ? '✓ copiado' : 'Copiar msg'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
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

            {/* Buscador de eventos por país */}
            <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Buscador de eventos por país</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                    Muestra un buscador por país en la sección de Eventos del feed.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    setSavingEventsCountry(true)
                    const next = !eventsCountryFilter
                    await fetch('/api/admin/settings', {
                      method: 'PATCH',
                      headers: { ...H(pass), 'Content-Type': 'application/json' },
                      body: JSON.stringify({ key: 'events_country_filter', value: next }),
                    })
                    setEventsCountryFilter(next)
                    setSavingEventsCountry(false)
                  }}
                  disabled={savingEventsCountry}
                  className="ml-4 shrink-0 rounded-full transition-all disabled:opacity-50"
                  style={{ width: 48, height: 28, background: eventsCountryFilter ? '#efff42' : 'rgba(255,255,255,0.1)', position: 'relative' }}>
                  <span style={{
                    position: 'absolute', top: 4,
                    left: eventsCountryFilter ? 24 : 4,
                    width: 20, height: 20, borderRadius: '50%',
                    background: eventsCountryFilter ? '#000' : 'rgba(255,255,255,0.4)',
                    transition: 'left 0.2s',
                  }} />
                </button>
              </div>
              <p className="text-xs mt-3 font-bold" style={{ color: eventsCountryFilter ? '#efff42' : 'rgba(255,255,255,0.2)' }}>
                {eventsCountryFilter ? 'Activado — se ve el buscador en Eventos' : 'Desactivado'}
              </p>
            </div>

            {/* Galería de tatuadores */}
            <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Galería de diseños</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                    Permite a los tatuadores subir hasta 3 fotos de sus mejores diseños, visibles en su perfil público.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    setSavingGallery(true)
                    const next = !galleryEnabled
                    await fetch('/api/admin/settings', {
                      method: 'PATCH',
                      headers: { ...H(pass), 'Content-Type': 'application/json' },
                      body: JSON.stringify({ key: 'artist_gallery_enabled', value: next }),
                    })
                    setGalleryEnabled(next)
                    setSavingGallery(false)
                  }}
                  disabled={savingGallery}
                  className="ml-4 shrink-0 rounded-full transition-all disabled:opacity-50"
                  style={{ width: 48, height: 28, background: galleryEnabled ? '#efff42' : 'rgba(255,255,255,0.1)', position: 'relative' }}>
                  <span style={{
                    position: 'absolute', top: 4,
                    left: galleryEnabled ? 24 : 4,
                    width: 20, height: 20, borderRadius: '50%',
                    background: galleryEnabled ? '#000' : 'rgba(255,255,255,0.4)',
                    transition: 'left 0.2s',
                  }} />
                </button>
              </div>
              <p className="text-xs mt-3 font-bold" style={{ color: galleryEnabled ? '#efff42' : 'rgba(255,255,255,0.2)' }}>
                {galleryEnabled ? 'Activada — los tatuadores pueden subir fotos de diseños' : 'Desactivada'}
              </p>
            </div>

            {/* Registro de nuevos tatuadores */}
            <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Registro de tatuadores</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                    Controla si el botón "+ tatuador/a" permite registrarse. Si está desactivado, al tocarlo aparece un aviso de que no hay lugar por el momento.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    setSavingRegistration(true)
                    const next = !registrationOpen
                    await fetch('/api/admin/settings', {
                      method: 'PATCH',
                      headers: { ...H(pass), 'Content-Type': 'application/json' },
                      body: JSON.stringify({ key: 'registration_open', value: next }),
                    })
                    setRegistrationOpen(next)
                    setSavingRegistration(false)
                  }}
                  disabled={savingRegistration}
                  className="ml-4 shrink-0 rounded-full transition-all disabled:opacity-50"
                  style={{ width: 48, height: 28, background: registrationOpen ? '#efff42' : 'rgba(255,255,255,0.1)', position: 'relative' }}>
                  <span style={{
                    position: 'absolute', top: 4,
                    left: registrationOpen ? 24 : 4,
                    width: 20, height: 20, borderRadius: '50%',
                    background: registrationOpen ? '#000' : 'rgba(255,255,255,0.4)',
                    transition: 'left 0.2s',
                  }} />
                </button>
              </div>
              <p className="text-xs mt-3 font-bold" style={{ color: registrationOpen ? '#efff42' : 'rgba(255,255,255,0.2)' }}>
                {registrationOpen ? 'Abierto — cualquiera puede registrarse' : 'Cerrado — se muestra aviso al tocar el botón'}
              </p>
            </div>

            {/* Contacto para verificación */}
            <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-sm font-bold text-white mb-1">Contacto para verificación</p>
              <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
                Los tatuadores envían su palabra de verificación a estos contactos. Dejá vacío el que no uses.
              </p>
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Instagram</p>
                  <input value={verifyIG} onChange={e => setVerifyIG(e.target.value)} placeholder="@flashttoo"
                    className="w-full text-sm text-white outline-none rounded-lg px-3 py-2"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>WhatsApp</p>
                  <input value={verifyWA} onChange={e => setVerifyWA(e.target.value)} placeholder="+54 9 11 1234 5678"
                    className="w-full text-sm text-white outline-none rounded-lg px-3 py-2"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
                <button
                  onClick={async () => {
                    setSavingVerify(true)
                    await Promise.all([
                      fetch('/api/admin/settings', { method: 'PATCH', headers: { ...H(pass), 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'verification_instagram', value: verifyIG }) }),
                      fetch('/api/admin/settings', { method: 'PATCH', headers: { ...H(pass), 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'verification_whatsapp', value: verifyWA }) }),
                    ])
                    setSavingVerify(false)
                  }}
                  disabled={savingVerify}
                  className="self-start text-xs px-4 py-2 rounded-lg font-bold disabled:opacity-50"
                  style={{ background: '#efff42', color: '#000' }}>
                  {savingVerify ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>

            {/* Storage R2 */}
            {r2Available && (
              <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">Almacenamiento — Cloudflare R2</p>
                    <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                      Activo: las fotos nuevas se guardan en R2 (egress gratis). Inactivo: se guardan en Supabase Storage.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      setSavingStorage(true)
                      const next = !storageR2
                      await fetch('/api/admin/settings', {
                        method: 'PATCH',
                        headers: { ...H(pass), 'Content-Type': 'application/json' },
                        body: JSON.stringify({ key: 'storage_provider', value: next ? 'r2' : 'supabase' }),
                      })
                      setStorageR2(next)
                      setSavingStorage(false)
                    }}
                    disabled={savingStorage}
                    className="ml-4 shrink-0 rounded-full transition-all disabled:opacity-50"
                    style={{ width: 48, height: 28, background: storageR2 ? '#efff42' : 'rgba(255,255,255,0.1)', position: 'relative' }}>
                    <span style={{
                      position: 'absolute', top: 4,
                      left: storageR2 ? 24 : 4,
                      width: 20, height: 20, borderRadius: '50%',
                      background: storageR2 ? '#000' : 'rgba(255,255,255,0.4)',
                      transition: 'left 0.2s',
                    }} />
                  </button>
                </div>
                <p className="text-xs mt-3 font-bold" style={{ color: storageR2 ? '#efff42' : 'rgba(255,255,255,0.2)' }}>
                  {storageR2 ? 'R2 activo — fotos nuevas van a Cloudflare R2' : 'Supabase Storage activo'}
                </p>
              </div>
            )}

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

            {/* Guía de tatuadores */}
            <div className="rounded-xl p-4 flex items-center justify-between gap-4"
              style={{ background: 'rgba(239,255,66,0.05)', border: '1px solid rgba(239,255,66,0.15)' }}>
              <div>
                <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 2 }}>Guía para Tatuadores</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>flashttoo.com/guia-tatuador</p>
              </div>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/guia-tatuador`
                  navigator.clipboard.writeText(url).catch(() => {})
                }}
                className="text-xs font-bold px-4 py-2 rounded-lg flex-shrink-0"
                style={{ background: 'rgba(239,255,66,0.12)', border: '1px solid rgba(239,255,66,0.3)', color: '#efff42', cursor: 'pointer' }}>
                Copiar link
              </button>
            </div>

            {/* Guía de estudios */}
            <div className="rounded-xl p-4 flex items-center justify-between gap-4"
              style={{ background: 'rgba(239,255,66,0.05)', border: '1px solid rgba(239,255,66,0.15)' }}>
              <div>
                <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 2 }}>Guía para Estudios</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>flashttoo.com/guia-estudio</p>
              </div>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/guia-estudio`
                  navigator.clipboard.writeText(url).catch(() => {})
                }}
                className="text-xs font-bold px-4 py-2 rounded-lg flex-shrink-0"
                style={{ background: 'rgba(239,255,66,0.12)', border: '1px solid rgba(239,255,66,0.3)', color: '#efff42', cursor: 'pointer' }}>
                Copiar link
              </button>
            </div>

            {/* Texto "¿Cómo funciona?" */}
            <div className="rounded-xl p-4"
              style={{ background: 'rgba(239,255,66,0.05)', border: '1px solid rgba(239,255,66,0.15)' }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold mb-2" style={{ color: 'rgba(255,255,255,0.8)' }}>Texto — ¿Cómo funciona?</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)', lineHeight: 1.7 }}>
                    Flashttoo es una app donde los tatuadores tienen su perfil con portfolio, ciudad y contacto, y los usuarios la usan para buscar artistas cerca suyo o explorar estilos.<br /><br />
                    Vos subís tus trabajos, tu info y listo — aparecés en el feed. Sin algoritmos raros, sin seguir a nadie. El que busca tatuadores en tu ciudad, te encuentra.<br /><br />
                    Se puede instalar como app en el celular y es gratis para los artistas.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const txt = `Flashttoo es una app donde los tatuadores tienen su perfil con portfolio, ciudad y contacto, y los usuarios la usan para buscar artistas cerca suyo o explorar estilos.\n\nVos subís tus trabajos, tu info y listo — aparecés en el feed. Sin algoritmos raros, sin seguir a nadie. El que busca tatuadores en tu ciudad, te encuentra.\n\nSe puede instalar como app en el celular y es gratis para los artistas.`
                    navigator.clipboard.writeText(txt).catch(() => {})
                  }}
                  className="text-xs font-bold px-4 py-2 rounded-lg flex-shrink-0"
                  style={{ background: 'rgba(239,255,66,0.12)', border: '1px solid rgba(239,255,66,0.3)', color: '#efff42', cursor: 'pointer' }}>
                  Copiar
                </button>
              </div>
            </div>

            {/* Toggle galería */}
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)', lineHeight: 1.6 }}>
              Las tarjetas aparecen en el feed cada ~20 posiciones. Al hacer clic se abre un modal con el contenido completo.
            </p>

            {/* Selector de idioma para las tarjetas */}
            {contentLangsAll.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {contentLangsAll.map(l => {
                  const hasCards = (cardsByLang[l.code]?.length ?? 0) > 0
                  const isSelected = selectedCardsLang === l.code
                  return (
                    <button key={l.code}
                      onClick={() => setSelectedCardsLang(l.code)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                      style={{
                        background: isSelected ? '#efff42' : 'rgba(255,255,255,0.05)',
                        color: isSelected ? '#000' : hasCards ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)',
                        border: `1px solid ${isSelected ? 'transparent' : hasCards ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
                      }}>
                      {l.flag} {l.name}
                      {hasCards && !isSelected && (
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', flexShrink: 0 }} />
                      )}
                    </button>
                  )
                })}
              </div>
            )}

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
            {/* ── CARTA SECRETA ─────────────────────────────────── */}
            <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: 'rgba(239,255,66,0.04)', border: '1px solid rgba(239,255,66,0.15)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">✦ Carta secreta</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
                    Se activa tocando el logo 3 veces. Mostrá una ilustración de un artista con link a su perfil. Imágenes: proporción 3:4 — recomendado 1800 × 2400 px.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    const next = !secretCardAdmin.active
                    setSecretCardAdmin(prev => ({ ...prev, active: next }))
                  }}
                  className="ml-4 shrink-0 rounded-full transition-all"
                  style={{ width: 48, height: 28, background: secretCardAdmin.active ? '#efff42' : 'rgba(255,255,255,0.1)', position: 'relative' }}>
                  <span style={{ position: 'absolute', top: 4, left: secretCardAdmin.active ? 24 : 4, width: 20, height: 20, borderRadius: '50%', background: secretCardAdmin.active ? '#000' : 'rgba(255,255,255,0.4)', transition: 'left 0.2s' }} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, position: 'relative' }}>
                <div>
                  <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Frente (ilustración)</p>
                  <label style={{ display: 'block', cursor: 'pointer' }}>
                    {secretCardPreview || secretCardAdmin.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={secretCardPreview || secretCardAdmin.image_url} alt=""
                        style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)' }} />
                    ) : (
                      <div style={{ aspectRatio: '3/4', borderRadius: 10, border: '2px dashed rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>+ Frente</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const f = e.target.files?.[0]; if (!f) return
                      setSecretCardFile(f); setSecretCardPreview(URL.createObjectURL(f))
                    }} />
                  </label>
                </div>
                <div>
                  <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Dorso</p>
                  <label style={{ display: 'block', cursor: 'pointer' }}>
                    {secretCardBackPreview || secretCardAdmin.back_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={secretCardBackPreview || secretCardAdmin.back_image_url} alt=""
                        style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)' }} />
                    ) : (
                      <div style={{ aspectRatio: '3/4', borderRadius: 10, border: '2px dashed rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>+ Dorso</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const f = e.target.files?.[0]; if (!f) return
                      setSecretCardBackFile(f); setSecretCardBackPreview(URL.createObjectURL(f))
                    }} />
                  </label>
                </div>
                {/* Botón guardar flotante sobre las cartas */}
                <button
                  onClick={async () => {
                    setSavingSecretCard(true)
                    const fd = new FormData()
                    if (secretCardFile) fd.append('image', secretCardFile)
                    if (secretCardBackFile) fd.append('back_image', secretCardBackFile)
                    fd.append('current_image_url', secretCardAdmin.image_url || '')
                    fd.append('current_back_image_url', secretCardAdmin.back_image_url || '')
                    fd.append('active', String(secretCardAdmin.active))
                    fd.append('artist_name', secretCardAdmin.artist_name)
                    fd.append('city', secretCardAdmin.city)
                    fd.append('link', secretCardAdmin.link)
                    fd.append('caption', secretCardAdmin.caption)
                    fd.append('number', secretCardAdmin.number)
                    const r = await fetch('/api/admin/secret-card', { method: 'POST', headers: { 'x-admin-pass': pass }, body: fd })
                    const d = await r.json()
                    if (d.card) { setSecretCardAdmin(d.card); setSecretCardFile(null); setSecretCardPreview(null); setSecretCardBackFile(null); setSecretCardBackPreview(null) }
                    setSavingSecretCard(false)
                  }}
                  disabled={savingSecretCard}
                  style={{
                    position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                    background: '#efff42', color: '#000', border: 'none', borderRadius: 20,
                    padding: '8px 22px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                    whiteSpace: 'nowrap', opacity: savingSecretCard ? 0.5 : 1,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
                  }}>
                  {savingSecretCard ? 'Guardando...' : 'Guardar carta'}
                </button>
              </div>

              {[
                { key: 'number',      label: 'Número de carta',    placeholder: 'Ej: 1' },
                { key: 'artist_name', label: 'Nombre del artista', placeholder: 'Ej: María Ink' },
                { key: 'city',        label: 'Ciudad',             placeholder: 'Ej: Buenos Aires' },
                { key: 'link',        label: 'Link al perfil',     placeholder: 'https://... o @usuario' },
                { key: 'caption',     label: 'Descripción (opcional)', placeholder: 'Texto que acompaña la ilustración...' },
              ].map(f => (
                <div key={f.key}>
                  <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{f.label}</p>
                  {f.key === 'caption' ? (
                    <textarea rows={3} value={String(secretCardAdmin[f.key as keyof typeof secretCardAdmin] ?? '')} placeholder={f.placeholder}
                      onChange={e => setSecretCardAdmin(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-full text-sm text-white outline-none rounded-lg px-3 py-2 resize-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  ) : (
                    <input type="text" value={String(secretCardAdmin[f.key as keyof typeof secretCardAdmin] ?? '')} placeholder={f.placeholder}
                      onChange={e => setSecretCardAdmin(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-full text-sm text-white outline-none rounded-lg px-3 py-2"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  )}
                </div>
              ))}

            </div>

            <button
              onClick={async () => {
                setSavingContent(true)
                await fetch('/api/admin/settings', {
                  method: 'PATCH',
                  headers: { ...H(pass), 'Content-Type': 'application/json' },
                  body: JSON.stringify({ key: selectedCardsLang === 'es' ? 'content_cards' : `content_cards_${selectedCardsLang}`, value: contentCards }),
                })
                setCardsByLang(prev => ({ ...prev, [selectedCardsLang]: contentCards }))
                setSavingContent(false)
              }}
              disabled={savingContent}
              className="self-end px-6 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50"
              style={{ background: '#efff42', color: '#000' }}>
              {savingContent ? 'Guardando...' : 'Guardar tarjetas'}
            </button>
          </div>

        ) : tab === 'sponsors2' ? (

          // ── SPONSORS V2 ───────────────────────────────────────────────────────
          <div className="flex flex-col gap-6" style={{ maxWidth: 600 }}>

            {/* Guía de proveedores */}
            <div className="rounded-xl p-4 flex items-center justify-between gap-4"
              style={{ background: 'rgba(239,255,66,0.05)', border: '1px solid rgba(239,255,66,0.15)' }}>
              <div>
                <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 2 }}>Guía para Proveedores</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>flashttoo.com/guia-proveedor</p>
              </div>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/guia-proveedor`
                  navigator.clipboard.writeText(url).catch(() => {})
                }}
                className="text-xs font-bold px-4 py-2 rounded-lg flex-shrink-0"
                style={{ background: 'rgba(239,255,66,0.12)', border: '1px solid rgba(239,255,66,0.3)', color: '#efff42', cursor: 'pointer' }}>
                Copiar link
              </button>
            </div>

            {/* Banner toggle */}
            <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Banner de marcas</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                    Activa o desactiva el banner de sponsors v2 en la app.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    setSavingBannerV2(true)
                    const next = !bannerV2Active
                    await fetch('/api/admin/settings', {
                      method: 'PATCH',
                      headers: { ...H(pass), 'Content-Type': 'application/json' },
                      body: JSON.stringify({ key: 'sponsors_v2_banner_active', value: next }),
                    })
                    setBannerV2Active(next)
                    setSavingBannerV2(false)
                  }}
                  disabled={savingBannerV2}
                  className="ml-4 shrink-0 rounded-full transition-all disabled:opacity-50"
                  style={{ width: 48, height: 28, background: bannerV2Active ? '#efff42' : 'rgba(255,255,255,0.1)', position: 'relative' }}>
                  <span style={{
                    position: 'absolute', top: 4,
                    left: bannerV2Active ? 24 : 4,
                    width: 20, height: 20, borderRadius: '50%',
                    background: bannerV2Active ? '#000' : 'rgba(255,255,255,0.4)',
                    transition: 'left 0.2s',
                  }} />
                </button>
              </div>
              <p className="text-xs mt-3 font-bold" style={{ color: bannerV2Active ? '#efff42' : 'rgba(255,255,255,0.2)' }}>
                {bannerV2Active ? 'Activo' : 'Inactivo'}
              </p>
            </div>

            {/* Formulario nuevo sponsor v2 */}
            <form
              onSubmit={async e => {
                e.preventDefault(); setSponsorV2Error('')
                if (!sponsorV2Logo) { setSponsorV2Error('Seleccioná un logo'); return }
                setSavingSponsorsV2(true)
                try {
                  const fd = new FormData()
                  fd.append('logo', sponsorV2Logo)
                  if (sponsorV2Bg) fd.append('bg_image', sponsorV2Bg)
                  if (sponsorV2DetailLogo) fd.append('detail_logo', sponsorV2DetailLogo)
                  fd.append('name', sponsorV2Form.name.trim())
                  fd.append('description', sponsorV2Form.description.trim())
                  fd.append('link', sponsorV2Form.link.trim())
                  fd.append('whatsapp', sponsorV2Form.whatsapp.trim())
                  fd.append('level', sponsorV2Form.level)
                  fd.append('city', sponsorV2Form.city.trim())
                  fd.append('country', sponsorV2Form.country.trim())
                  fd.append('keep_color', String(sponsorV2Form.keep_color))
                  if (sponsorV2Form.starts_at) fd.append('starts_at', new Date(sponsorV2Form.starts_at).toISOString())
                  if (sponsorV2Form.expires_at) fd.append('expires_at', new Date(sponsorV2Form.expires_at).toISOString())
                  fd.append('notes', sponsorV2Form.notes.trim())
                  fd.append('detail_logo_mode', sponsorV2Form.detail_logo_mode)
                  fd.append('logo_scale', String(sponsorV2Form.logo_scale))
                  const r = await fetch('/api/admin/sponsors-v2', { method: 'POST', headers: H(pass), body: fd })
                  const d = await r.json()
                  if (!r.ok) throw new Error(d.error || 'Error')
                  setSponsorsV2(prev => [d.sponsor, ...prev])
                  setSponsorV2Form({ name: '', description: '', link: '', whatsapp: '', level: 'global', city: '', country: '', starts_at: '', expires_at: '', keep_color: false, notes: '', detail_logo_mode: 'white', logo_scale: 100 })
                  setSponsorV2Logo(null); setSponsorV2LogoPreview(null)
                  setSponsorV2Bg(null); setSponsorV2BgPreview(null)
                  setSponsorV2DetailLogo(null); setSponsorV2DetailLogoPreview(null)
                } catch (err: unknown) {
                  setSponsorV2Error(err instanceof Error ? err.message : 'Error')
                } finally { setSavingSponsorsV2(false) }
              }}
              className="rounded-xl p-5 flex flex-col gap-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-bold" style={{ color: '#efff42', letterSpacing: '0.08em' }}>NUEVA MARCA</p>

              {/* Logo + Imagen de fondo */}
              <div className="flex gap-4 flex-wrap">
                <label className="cursor-pointer block flex-1 min-w-[140px]">
                  <p className="text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Logo *</p>
                  <div className="flex items-center gap-3">
                    {sponsorV2LogoPreview ? (
                      <div className="rounded-lg overflow-hidden flex items-center justify-center"
                        style={{ width: 100, height: 40, background: sponsorV2Form.keep_color ? '#fff' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={sponsorV2LogoPreview} alt="" style={{ maxHeight: 32, maxWidth: 90, objectFit: 'contain', filter: sponsorV2Form.keep_color ? 'none' : 'brightness(0) invert(1)', opacity: sponsorV2Form.keep_color ? 1 : 0.6 }} />
                      </div>
                    ) : (
                      <div className="rounded-lg flex items-center justify-center text-xs"
                        style={{ width: 100, height: 40, border: '2px dashed rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.2)' }}>
                        subir logo
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]; if (!file) return
                        setSponsorV2Logo(file)
                        setSponsorV2LogoPreview(URL.createObjectURL(file))
                      }} />
                  </div>
                </label>
                <label className="cursor-pointer block flex-1 min-w-[140px]">
                  <p className="text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Imagen de fondo</p>
                  <div className="flex items-center gap-3">
                    {sponsorV2BgPreview ? (
                      <div className="rounded-lg overflow-hidden flex items-center justify-center"
                        style={{ width: 100, height: 40, border: '1px solid rgba(255,255,255,0.1)' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={sponsorV2BgPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : (
                      <div className="rounded-lg flex items-center justify-center text-xs text-center"
                        style={{ width: 100, height: 40, border: '2px dashed rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.2)', lineHeight: 1.3 }}>
                        fondo<br/>(opcional)
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]; if (!file) return
                        setSponsorV2Bg(file)
                        setSponsorV2BgPreview(URL.createObjectURL(file))
                      }} />
                  </div>
                </label>
                <label className="cursor-pointer block flex-1 min-w-[140px]">
                  <p className="text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Logo a color (modal)</p>
                  <div className="flex items-center gap-3">
                    {sponsorV2DetailLogoPreview ? (
                      <div className="rounded-lg overflow-hidden flex items-center justify-center"
                        style={{ width: 100, height: 40, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={sponsorV2DetailLogoPreview} alt="" style={{ maxHeight: 32, maxWidth: 90, objectFit: 'contain' }} />
                      </div>
                    ) : (
                      <div className="rounded-lg flex items-center justify-center text-xs text-center"
                        style={{ width: 100, height: 40, border: '2px dashed rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.2)', lineHeight: 1.3 }}>
                        color<br/>(opcional)
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]; if (!file) return
                        setSponsorV2DetailLogo(file)
                        setSponsorV2DetailLogoPreview(URL.createObjectURL(file))
                      }} />
                  </div>
                </label>
              </div>

              {/* Modo logo modal */}
              <div>
                <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Logo en modal</p>
                <div className="flex gap-2">
                  {([['white', 'Blanco'], ['color', 'Color'], ['shadow', 'Sombra']] as const).map(([val, label]) => (
                    <button key={val} type="button"
                      onClick={() => setSponsorV2Form(f => ({ ...f, detail_logo_mode: val }))}
                      className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
                      style={{
                        background: sponsorV2Form.detail_logo_mode === val ? '#efff42' : 'rgba(255,255,255,0.05)',
                        color: sponsorV2Form.detail_logo_mode === val ? '#000' : 'rgba(255,255,255,0.4)',
                        border: `1px solid ${sponsorV2Form.detail_logo_mode === val ? 'transparent' : 'rgba(255,255,255,0.08)'}`,
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  {sponsorV2Form.detail_logo_mode === 'white' ? 'Logo invertido a blanco — para logos negros' : sponsorV2Form.detail_logo_mode === 'color' ? 'Logo en sus colores originales' : 'Logo original con halo blanco — para logos negros sin invertir'}
                </p>
              </div>

              {/* Tamaño del logo */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tamaño del logo</p>
                  <span className="text-xs font-bold" style={{ color: '#efff42' }}>{sponsorV2Form.logo_scale}%</span>
                </div>
                <input type="range" min={50} max={150} step={5} value={sponsorV2Form.logo_scale}
                  onChange={e => setSponsorV2Form(f => ({ ...f, logo_scale: parseInt(e.target.value, 10) }))}
                  className="w-full" />
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  Ajustá si este logo se ve más chico o más grande que los demás (banner y vista de detalle).
                </p>
              </div>

              {/* Nivel */}
              <div>
                <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nivel</p>
                <div className="flex gap-2">
                  {(['global', 'country', 'city'] as const).map(lvl => (
                    <button key={lvl} type="button"
                      onClick={() => setSponsorV2Form(f => ({ ...f, level: lvl, city: lvl === 'global' ? '' : f.city, country: lvl === 'global' ? '' : f.country }))}
                      className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                      style={{
                        background: sponsorV2Form.level === lvl ? '#efff42' : 'rgba(255,255,255,0.05)',
                        color: sponsorV2Form.level === lvl ? '#000' : 'rgba(255,255,255,0.4)',
                        border: `1px solid ${sponsorV2Form.level === lvl ? 'transparent' : 'rgba(255,255,255,0.08)'}`,
                      }}>
                      {lvl === 'global' ? 'Global' : lvl === 'country' ? 'País' : 'Ciudad'}
                    </button>
                  ))}
                </div>
                {sponsorV2Form.level !== 'global' && (
                  <div className="grid grid-cols-1 gap-3 mt-3">
                    <div>
                      <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {sponsorV2Form.level === 'city' ? 'Países (separar con coma)' : 'País'}
                      </p>
                      <input value={sponsorV2Form.country} onChange={e => setSponsorV2Form(f => ({ ...f, country: e.target.value }))}
                        placeholder={sponsorV2Form.level === 'city' ? 'Argentina, Chile' : 'Argentina'} className={iCls} />
                    </div>
                    <div>
                      <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {sponsorV2Form.level === 'city' ? 'Ciudades (separar con coma)' : 'Ciudad (opcional, para mostrar dónde están)'}
                      </p>
                      <input value={sponsorV2Form.city} onChange={e => setSponsorV2Form(f => ({ ...f, city: e.target.value }))}
                        placeholder={sponsorV2Form.level === 'city' ? 'Buenos Aires, Santiago' : 'Buenos Aires'} className={iCls} />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AdField label="Nombre *">
                  <input required value={sponsorV2Form.name} onChange={e => setSponsorV2Form(f => ({ ...f, name: e.target.value }))}
                    placeholder="Estudio Roma" className={iCls} />
                </AdField>
                <AdField label="Link">
                  <input value={sponsorV2Form.link} onChange={e => setSponsorV2Form(f => ({ ...f, link: e.target.value }))}
                    placeholder="https://..." className={iCls} />
                </AdField>
                <AdField label="WhatsApp">
                  <input value={sponsorV2Form.whatsapp} onChange={e => setSponsorV2Form(f => ({ ...f, whatsapp: e.target.value }))}
                    placeholder="5491123456789" className={iCls} />
                </AdField>
                <AdField label="Inicio (vacío = hoy)">
                  <input type="date" value={sponsorV2Form.starts_at} onChange={e => setSponsorV2Form(f => ({ ...f, starts_at: e.target.value }))}
                    className={iCls} style={{ colorScheme: 'dark' }} />
                </AdField>
                <AdField label="Vencimiento (opcional)">
                  <input type="date" value={sponsorV2Form.expires_at} onChange={e => setSponsorV2Form(f => ({ ...f, expires_at: e.target.value }))}
                    className={iCls} style={{ colorScheme: 'dark' }} />
                </AdField>
              </div>

              {/* Descripción */}
              <div>
                <p className="text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Descripción (qué hacen / qué ofrecen)</p>
                <textarea value={sponsorV2Form.description} rows={3}
                  onChange={e => setSponsorV2Form(f => ({ ...f, description: e.target.value }))}
                  placeholder="Breve presentación de la marca, sin intención de vender..."
                  className={iCls} style={{ resize: 'none', lineHeight: 1.6 }} />
              </div>

              {/* Notas internas */}
              <div>
                <p className="text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notas internas</p>
                <textarea value={sponsorV2Form.notes} rows={2}
                  onChange={e => setSponsorV2Form(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Precio acordado, contacto, condiciones..."
                  className={iCls} style={{ resize: 'none', lineHeight: 1.6 }} />
              </div>

              {/* Mantener color */}
              <button type="button"
                onClick={() => setSponsorV2Form(f => ({ ...f, keep_color: !f.keep_color }))}
                className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left transition-all"
                style={{
                  background: sponsorV2Form.keep_color ? 'rgba(239,255,66,0.06)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${sponsorV2Form.keep_color ? 'rgba(239,255,66,0.2)' : 'rgba(255,255,255,0.07)'}`,
                }}>
                <div className="shrink-0 rounded-full transition-all"
                  style={{ width: 40, height: 24, background: sponsorV2Form.keep_color ? '#efff42' : 'rgba(255,255,255,0.1)', position: 'relative' }}>
                  <span style={{
                    position: 'absolute', top: 3,
                    left: sponsorV2Form.keep_color ? 19 : 3,
                    width: 18, height: 18, borderRadius: '50%',
                    background: sponsorV2Form.keep_color ? '#000' : 'rgba(255,255,255,0.4)',
                    transition: 'left 0.15s',
                  }} />
                </div>
                <p className="text-sm" style={{ color: sponsorV2Form.keep_color ? '#efff42' : 'rgba(255,255,255,0.5)' }}>
                  {sponsorV2Form.keep_color ? 'Mantener color original' : 'Logo en negro'}
                </p>
              </button>

              {sponsorV2Error && <p className="text-xs text-red-400">{sponsorV2Error}</p>}
              <button type="submit" disabled={savingSponsorsV2}
                className="self-end px-6 py-2 rounded-lg font-bold text-sm disabled:opacity-50"
                style={{ background: '#efff42', color: '#000' }}>
                {savingSponsorsV2 ? 'Guardando...' : 'Agregar marca'}
              </button>
            </form>

            {/* Lista sponsors v2 */}
            <div className="flex flex-col gap-3">
              {sponsorsV2.length === 0 && (
                <p className="text-sm text-center py-8" style={{ color: 'rgba(255,255,255,0.1)' }}>Sin marcas</p>
              )}
              {sponsorsV2.map(sp => {
                const now = new Date()
                const exp = sp.expires_at ? new Date(sp.expires_at) : null
                const expired = exp && exp < now
                const days = exp ? Math.ceil((exp.getTime() - now.getTime()) / 86400000) : null
                const levelColor = sp.level === 'global' ? '#efff42' : sp.level === 'country' ? '#60a5fa' : '#c084fc'
                const levelLabel = sp.level === 'global' ? 'Global' : sp.level === 'country' ? `País · ${sp.country}` : `Ciudad · ${sp.city}`
                return (
                  <div key={sp.id} className="flex flex-col gap-0">
                  <div className="rounded-xl p-4 flex flex-col gap-3"
                    style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${sp.active && !expired ? 'rgba(239,255,66,0.12)' : 'rgba(255,255,255,0.06)'}`, opacity: expired ? 0.5 : 1 }}>
                    {/* Fila superior: logo + info */}
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 flex flex-col gap-1">
                        <div className="rounded-lg flex items-center justify-center overflow-hidden"
                          style={{ width: 80, height: 32, background: sp.keep_color ? '#fff' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={sp.logo_url} alt={sp.name} style={{ maxHeight: 26, maxWidth: 72, objectFit: 'contain', filter: sp.keep_color ? 'none' : 'brightness(0) invert(1)', opacity: sp.keep_color ? 1 : 0.6 }} />
                        </div>
                        {sp.detail_logo_url && (
                          <div className="rounded-lg flex items-center justify-center overflow-hidden"
                            style={{ width: 80, height: 24, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(239,255,66,0.15)' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={sp.detail_logo_url} alt="" style={{ maxHeight: 18, maxWidth: 72, objectFit: 'contain' }} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="text-sm font-bold text-white">{sp.name}</p>
                          <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                            style={{ background: `${levelColor}18`, color: levelColor, fontSize: 10 }}>
                            {levelLabel}
                          </span>
                        </div>
                        {sp.description && (
                          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
                            {sp.description}
                          </p>
                        )}
                        {sp.notes && (
                          <p className="text-xs mt-1 px-2 py-0.5 rounded" style={{ color: 'rgba(239,255,66,0.6)', background: 'rgba(239,255,66,0.05)', lineHeight: 1.5 }}>
                            {sp.notes}
                          </p>
                        )}
                        {exp && (
                          <p className="text-xs mt-1" style={{ color: expired ? '#f87171' : (days ?? 0) <= 7 ? '#fb923c' : 'rgba(255,255,255,0.25)' }}>
                            {expired ? `venció hace ${-days!}d` : `vence en ${days}d`}
                          </p>
                        )}
                        <p className="text-xs mt-1" style={{ color: sp.clicks > 0 ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.15)' }}>
                          {sp.clicks > 0 ? `${sp.clicks} clic${sp.clicks !== 1 ? 's' : ''}` : 'sin clics'}
                        </p>
                      </div>
                    </div>
                    {/* Fila inferior: botones */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={async () => {
                          await fetch(`/api/admin/sponsors-v2/${sp.id}`, {
                            method: 'PATCH', headers: { ...H(pass), 'Content-Type': 'application/json' },
                            body: JSON.stringify({ keep_color: !sp.keep_color }),
                          })
                          setSponsorsV2(prev => prev.map(s => s.id === sp.id ? { ...s, keep_color: !s.keep_color } : s))
                        }}
                        className="text-xs px-3 py-1 rounded-full transition-all"
                        style={{
                          border: `1px solid ${sp.keep_color ? 'rgba(147,197,253,0.3)' : 'rgba(255,255,255,0.1)'}`,
                          color: sp.keep_color ? '#93c5fd' : 'rgba(255,255,255,0.3)',
                          background: sp.keep_color ? 'rgba(147,197,253,0.07)' : 'transparent',
                        }}>
                        {sp.keep_color ? 'color' : 'negro'}
                      </button>
                      <button
                        onClick={async () => {
                          await fetch(`/api/admin/sponsors-v2/${sp.id}`, {
                            method: 'PATCH', headers: { ...H(pass), 'Content-Type': 'application/json' },
                            body: JSON.stringify({ active: !sp.active }),
                          })
                          setSponsorsV2(prev => prev.map(s => s.id === sp.id ? { ...s, active: !s.active } : s))
                        }}
                        className="text-xs px-3 py-1 rounded-full transition-all"
                        style={{
                          border: `1px solid ${sp.active ? 'rgba(239,255,66,0.3)' : 'rgba(255,255,255,0.1)'}`,
                          color: sp.active ? '#efff42' : 'rgba(255,255,255,0.3)',
                          background: sp.active ? 'rgba(239,255,66,0.07)' : 'transparent',
                        }}>
                        {sp.active ? 'activo' : 'inactivo'}
                      </button>
                      <button
                        onClick={() => setPreviewV2(sp)}
                        className="text-xs px-3 py-1 rounded-full transition-all"
                        style={{ border: '1px solid rgba(147,197,253,0.25)', color: '#93c5fd' }}>
                        vista previa
                      </button>
                      <button
                        onClick={() => loadStatsV2(sp)}
                        className="text-xs px-3 py-1 rounded-full transition-all"
                        style={{ border: '1px solid rgba(167,243,208,0.25)', color: '#6ee7b7' }}>
                        estadísticas
                      </button>
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/insumos/${sp.id}`
                          navigator.clipboard.writeText(url).catch(() => {})
                        }}
                        className="text-xs px-3 py-1 rounded-full transition-all"
                        style={{ border: '1px solid rgba(192,132,252,0.25)', color: '#c084fc' }}>
                        copiar link
                      </button>
                      <button
                        onClick={() => {
                          setEditingV2(sp.id)
                          setEditV2Form({
                            name: sp.name,
                            description: sp.description || '',
                            link: sp.link || '',
                            whatsapp: sp.whatsapp || '',
                            level: sp.level,
                            city: sp.city || '',
                            country: sp.country || '',
                            keep_color: sp.keep_color,
                            starts_at: sp.starts_at ? sp.starts_at.slice(0, 10) : '',
                            expires_at: sp.expires_at ? sp.expires_at.slice(0, 10) : '',
                            notes: sp.notes || '',
                            detail_logo_mode: sp.detail_logo_mode || 'white',
                            logo_scale: sp.logo_scale || 100,
                          })
                          setEditV2DetailLogoFile(null); setEditV2DetailLogoPreview(null)
                        }}
                        className="text-xs px-3 py-1 rounded-full transition-all"
                        style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)' }}>
                        editar
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm('¿Borrar esta marca?')) return
                          await fetch(`/api/admin/sponsors-v2/${sp.id}`, { method: 'DELETE', headers: H(pass) })
                          setSponsorsV2(prev => prev.filter(s => s.id !== sp.id))
                        }}
                        className="text-xs px-3 py-1 rounded-full"
                        style={{ border: '1px solid rgba(255,80,80,0.2)', color: 'rgba(255,100,100,0.5)' }}>
                        borrar
                      </button>
                    </div>
                  </div>

                  {/* Edición inline */}
                  {editingV2 === sp.id && (
                    <div className="mt-3 pt-4 flex flex-col gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                      <div className="flex gap-2">
                        {(['global', 'country', 'city'] as const).map(lvl => (
                          <button key={lvl} type="button"
                            onClick={() => setEditV2Form(f => ({ ...f, level: lvl }))}
                            className="flex-1 py-1.5 rounded-lg text-xs font-bold"
                            style={{
                              background: editV2Form.level === lvl ? '#efff42' : 'rgba(255,255,255,0.05)',
                              color: editV2Form.level === lvl ? '#000' : 'rgba(255,255,255,0.4)',
                              border: `1px solid ${editV2Form.level === lvl ? 'transparent' : 'rgba(255,255,255,0.08)'}`,
                            }}>
                            {lvl === 'global' ? 'Global' : lvl === 'country' ? 'País' : 'Ciudad'}
                          </button>
                        ))}
                      </div>
                      {editV2Form.level !== 'global' && (
                        <div className="flex flex-col gap-2">
                          <div>
                            <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                              {editV2Form.level === 'city' ? 'Países (separar con coma)' : 'País'}
                            </p>
                            <input value={editV2Form.country} onChange={e => setEditV2Form(f => ({ ...f, country: e.target.value }))}
                              placeholder={editV2Form.level === 'city' ? 'Argentina, Chile' : 'Argentina'} className={iCls} />
                          </div>
                          <div>
                            <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                              {editV2Form.level === 'city' ? 'Ciudades (separar con coma)' : 'Ciudad (opcional, para mostrar dónde están)'}
                            </p>
                            <input value={editV2Form.city} onChange={e => setEditV2Form(f => ({ ...f, city: e.target.value }))}
                              placeholder={editV2Form.level === 'city' ? 'Buenos Aires, Santiago' : 'Buenos Aires'} className={iCls} />
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Nombre</p>
                          <input value={editV2Form.name} onChange={e => setEditV2Form(f => ({ ...f, name: e.target.value }))} className={iCls} />
                        </div>
                        <div>
                          <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Link</p>
                          <input value={editV2Form.link} onChange={e => setEditV2Form(f => ({ ...f, link: e.target.value }))} placeholder="https://..." className={iCls} />
                        </div>
                        <div>
                          <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>WhatsApp</p>
                          <input value={editV2Form.whatsapp} onChange={e => setEditV2Form(f => ({ ...f, whatsapp: e.target.value }))} placeholder="5491123456789" className={iCls} />
                        </div>
                        <div>
                          <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Inicio</p>
                          <input type="date" value={editV2Form.starts_at} onChange={e => setEditV2Form(f => ({ ...f, starts_at: e.target.value }))} className={iCls} style={{ colorScheme: 'dark' }} />
                        </div>
                        <div>
                          <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Vencimiento</p>
                          <input type="date" value={editV2Form.expires_at} onChange={e => setEditV2Form(f => ({ ...f, expires_at: e.target.value }))} className={iCls} style={{ colorScheme: 'dark' }} />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Descripción</p>
                        <textarea value={editV2Form.description} rows={3}
                          onChange={e => setEditV2Form(f => ({ ...f, description: e.target.value }))}
                          className={iCls} style={{ resize: 'none', lineHeight: 1.6 }} />
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Notas internas</p>
                        <textarea value={editV2Form.notes} rows={2}
                          onChange={e => setEditV2Form(f => ({ ...f, notes: e.target.value }))}
                          placeholder="Precio acordado, contacto, condiciones..."
                          className={iCls} style={{ resize: 'none', lineHeight: 1.6 }} />
                      </div>
                      {/* Imágenes */}
                      <div className="flex gap-3 flex-wrap">
                        <label className="cursor-pointer block flex-1 min-w-[140px]">
                          <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Imagen de fondo</p>
                          <div className="flex items-center gap-3">
                            {editV2BgPreview || sp.bg_image_url ? (
                              <div className="rounded-lg overflow-hidden" style={{ width: 80, height: 36, border: '1px solid rgba(255,255,255,0.1)' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={editV2BgPreview || sp.bg_image_url!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                            ) : (
                              <div className="rounded-lg flex items-center justify-center text-xs"
                                style={{ width: 80, height: 36, border: '2px dashed rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.2)' }}>
                                sin fondo
                              </div>
                            )}
                            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                              {editV2BgPreview ? 'nueva seleccionada' : 'clic para cambiar'}
                            </span>
                            <input type="file" accept="image/*" className="hidden"
                              onChange={e => {
                                const file = e.target.files?.[0]; if (!file) return
                                setEditV2BgFile(file)
                                setEditV2BgPreview(URL.createObjectURL(file))
                              }} />
                          </div>
                        </label>
                        <label className="cursor-pointer block flex-1 min-w-[140px]">
                          <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Logo a color (modal)</p>
                          <div className="flex items-center gap-3">
                            {editV2DetailLogoPreview || sp.detail_logo_url ? (
                              <div className="rounded-lg overflow-hidden flex items-center justify-center"
                                style={{ width: 80, height: 36, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(239,255,66,0.2)' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={editV2DetailLogoPreview || sp.detail_logo_url!} alt="" style={{ maxHeight: 28, maxWidth: 74, objectFit: 'contain' }} />
                              </div>
                            ) : (
                              <div className="rounded-lg flex items-center justify-center text-xs"
                                style={{ width: 80, height: 36, border: '2px dashed rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.2)' }}>
                                sin color
                              </div>
                            )}
                            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                              {editV2DetailLogoPreview ? 'nueva seleccionada' : 'clic para cambiar'}
                            </span>
                            <input type="file" accept="image/*" className="hidden"
                              onChange={e => {
                                const file = e.target.files?.[0]; if (!file) return
                                setEditV2DetailLogoFile(file)
                                setEditV2DetailLogoPreview(URL.createObjectURL(file))
                              }} />
                          </div>
                        </label>
                      </div>
                      {/* Modo logo modal */}
                      <div>
                        <p className="text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Logo en modal</p>
                        <div className="flex gap-2">
                          {([['white', 'Blanco'], ['color', 'Color'], ['shadow', 'Sombra']] as const).map(([val, label]) => (
                            <button key={val} type="button"
                              onClick={() => setEditV2Form(f => ({ ...f, detail_logo_mode: val }))}
                              className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
                              style={{
                                background: editV2Form.detail_logo_mode === val ? '#efff42' : 'rgba(255,255,255,0.05)',
                                color: editV2Form.detail_logo_mode === val ? '#000' : 'rgba(255,255,255,0.4)',
                                border: `1px solid ${editV2Form.detail_logo_mode === val ? 'transparent' : 'rgba(255,255,255,0.08)'}`,
                              }}>
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Tamaño del logo */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Tamaño del logo</p>
                          <span className="text-xs font-bold" style={{ color: '#efff42' }}>{editV2Form.logo_scale}%</span>
                        </div>
                        <input type="range" min={50} max={150} step={5} value={editV2Form.logo_scale}
                          onChange={e => setEditV2Form(f => ({ ...f, logo_scale: parseInt(e.target.value, 10) }))}
                          className="w-full" />
                      </div>
                      <button type="button" onClick={() => setEditV2Form(f => ({ ...f, keep_color: !f.keep_color }))}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-left"
                        style={{ background: editV2Form.keep_color ? 'rgba(239,255,66,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${editV2Form.keep_color ? 'rgba(239,255,66,0.2)' : 'rgba(255,255,255,0.07)'}` }}>
                        <div className="shrink-0 rounded-full" style={{ width: 36, height: 20, background: editV2Form.keep_color ? '#efff42' : 'rgba(255,255,255,0.1)', position: 'relative' }}>
                          <span style={{ position: 'absolute', top: 2, left: editV2Form.keep_color ? 17 : 2, width: 16, height: 16, borderRadius: '50%', background: editV2Form.keep_color ? '#000' : 'rgba(255,255,255,0.4)', transition: 'left 0.15s' }} />
                        </div>
                        <p className="text-xs" style={{ color: editV2Form.keep_color ? '#efff42' : 'rgba(255,255,255,0.4)' }}>
                          {editV2Form.keep_color ? 'Color original' : 'Logo en negro'}
                        </p>
                      </button>
                      <div className="flex gap-2 justify-end">
                        <button type="button" onClick={() => setEditingV2(null)}
                          className="px-4 py-2 rounded-lg text-xs"
                          style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)' }}>
                          Cancelar
                        </button>
                        <button type="button" disabled={savingEditV2}
                          onClick={async () => {
                            setSavingEditV2(true)
                            let r: Response
                            if (editV2BgFile || editV2DetailLogoFile) {
                              const fd = new FormData()
                              if (editV2BgFile) fd.append('bg_image', editV2BgFile)
                              if (editV2DetailLogoFile) fd.append('detail_logo', editV2DetailLogoFile)
                              fd.append('name', editV2Form.name.trim())
                              fd.append('description', editV2Form.description.trim())
                              fd.append('link', editV2Form.link.trim())
                              fd.append('whatsapp', editV2Form.whatsapp.trim())
                              fd.append('level', editV2Form.level)
                              fd.append('city', editV2Form.city.trim())
                              fd.append('country', editV2Form.country.trim())
                              fd.append('keep_color', String(editV2Form.keep_color))
                              if (editV2Form.starts_at) fd.append('starts_at', new Date(editV2Form.starts_at).toISOString())
                              if (editV2Form.expires_at) fd.append('expires_at', new Date(editV2Form.expires_at).toISOString())
                              fd.append('notes', editV2Form.notes.trim())
                              fd.append('detail_logo_mode', editV2Form.detail_logo_mode)
                              fd.append('logo_scale', String(editV2Form.logo_scale))
                              r = await fetch(`/api/admin/sponsors-v2/${sp.id}`, { method: 'PATCH', headers: H(pass), body: fd })
                            } else {
                              r = await fetch(`/api/admin/sponsors-v2/${sp.id}`, {
                                method: 'PATCH',
                                headers: { ...H(pass), 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  name: editV2Form.name.trim(),
                                  description: editV2Form.description.trim() || null,
                                  link: editV2Form.link.trim() || null,
                                  whatsapp: editV2Form.whatsapp.trim() || null,
                                  level: editV2Form.level,
                                  city: editV2Form.city.trim() || null,
                                  country: editV2Form.country.trim() || null,
                                  keep_color: editV2Form.keep_color,
                                  ...(editV2Form.starts_at ? { starts_at: new Date(editV2Form.starts_at).toISOString() } : {}),
                                  expires_at: editV2Form.expires_at ? new Date(editV2Form.expires_at).toISOString() : null,
                                  notes: editV2Form.notes.trim() || null,
                                  detail_logo_mode: editV2Form.detail_logo_mode,
                                  logo_scale: editV2Form.logo_scale,
                                }),
                              })
                            }
                            const d = await r.json()
                            if (d.sponsor) setSponsorsV2(prev => prev.map(s => s.id === sp.id ? d.sponsor : s))
                            setEditingV2(null)
                            setEditV2BgFile(null); setEditV2BgPreview(null)
                            setEditV2DetailLogoFile(null); setEditV2DetailLogoPreview(null)
                            setSavingEditV2(false)
                          }}
                          className="px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-40"
                          style={{ background: '#efff42', color: '#000' }}>
                          {savingEditV2 ? 'Guardando...' : 'Guardar'}
                        </button>
                      </div>
                    </div>
                  )}
                  </div>
                )
              })}
            </div>

            {/* Vista previa — réplica del modal público */}
            {previewV2 && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: '#000', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewV2.bg_image_url || previewV2.logo_url} alt="" aria-hidden style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                    objectFit: 'cover', objectPosition: 'center', transform: 'scale(1.04)', opacity: 0.6,
                  }} />
                </div>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.45) 40%, rgba(0,0,0,0.93) 68%, rgba(0,0,0,1) 100%)',
                }} />
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '20px 20px 0', display: 'flex', justifyContent: 'flex-end', zIndex: 3 }}>
                  <button onClick={() => setPreviewV2(null)} style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 14,
                  }}>✕</button>
                </div>
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 2,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: '80px 36px 32px',
                }}>
                  <div style={{ flex: 1, minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '65%', maxWidth: 280, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewV2.detail_logo_url || previewV2.logo_url} alt={previewV2.name} style={{
                        maxHeight: `${previewV2.logo_scale || 100}%`, maxWidth: `${previewV2.logo_scale || 100}%`, objectFit: 'contain',
                        filter: previewV2.detail_logo_mode === 'color' ? 'none'
                          : previewV2.detail_logo_mode === 'shadow' ? 'drop-shadow(0 0 10px rgba(255,255,255,0.95)) drop-shadow(0 0 4px rgba(255,255,255,0.8))'
                          : 'brightness(0) invert(1)',
                        opacity: 1,
                      } as React.CSSProperties} />
                    </div>
                  </div>
                  <div style={{ width: '100%', maxWidth: 480 }}>
                    <p style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 10px', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
                      {previewV2.name}
                    </p>
                    {previewV2.description && (
                      <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.52)', lineHeight: 1.75, margin: '0 0 28px' }}>
                        {previewV2.description}
                      </p>
                    )}
                    {previewV2.link ? (
                      <a href={previewV2.link} target="_blank" rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 8,
                          padding: '13px 26px', background: '#efff42', color: '#000',
                          borderRadius: 14, fontSize: 14, fontWeight: 800, textDecoration: 'none',
                        }}>Ver más →</a>
                    ) : (
                      <div style={{ height: 12 }} />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

        ) : tab === 'agregar' ? (

          // ── AGREGAR ──────────────────────────────────────────────────────────
          <AddArtistForm pass={pass} onAdded={a => { setArtists(prev => [a, ...prev]); setArtistsTotal(prev => prev + 1) }} availableStyles={adminStyles} existingArtists={artists} />

        ) : tab === 'convenciones' ? (

          // ── CONVENCIONES ─────────────────────────────────────────────────────
          <div className="flex flex-col gap-8">

            {/* Guía de convenciones */}
            <div className="rounded-xl p-4 flex items-center justify-between gap-4"
              style={{ background: 'rgba(239,255,66,0.05)', border: '1px solid rgba(239,255,66,0.15)' }}>
              <div>
                <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 2 }}>Guía para Convenciones</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>flashttoo.com/guia-convencion</p>
              </div>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/guia-convencion`
                  navigator.clipboard.writeText(url).catch(() => {})
                }}
                className="text-xs font-bold px-4 py-2 rounded-lg flex-shrink-0"
                style={{ background: 'rgba(239,255,66,0.12)', border: '1px solid rgba(239,255,66,0.3)', color: '#efff42', cursor: 'pointer' }}>
                Copiar link
              </button>
            </div>

            {/* Formulario nueva convención */}
            <form onSubmit={saveConv} className="rounded-xl p-5 flex flex-col gap-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-bold" style={{ color: '#efff42', letterSpacing: '0.08em' }}>NUEVA CONVENCIÓN</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Flyer */}
                <label className="cursor-pointer block">
                  <p className="text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Flyer</p>
                  {convImagePreview ? (
                    <div className="relative rounded-xl overflow-hidden" style={{ paddingBottom: '60%' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={convImagePreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="rounded-xl flex items-center justify-center text-xs"
                      style={{ paddingBottom: '60%', position: 'relative', border: '2px dashed rgba(255,255,255,0.08)' }}>
                      <span className="absolute" style={{ color: 'rgba(255,255,255,0.2)' }}>subir flyer</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleConvImage} className="hidden" />
                </label>

                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>País (opcional)</p>
                    <input value={convForm.country} onChange={e => setConvForm(v => ({ ...v, country: e.target.value }))} placeholder="Ej: Argentina"
                      className="w-full py-2 px-3 text-sm text-white outline-none rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nombre (opcional)</p>
                    <input value={convForm.name} onChange={e => setConvForm(v => ({ ...v, name: e.target.value }))} placeholder="Ej: FestiTattoo 2025"
                      className="w-full py-2 px-3 text-sm text-white outline-none rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Link (opcional)</p>
                    <input value={convForm.link} onChange={e => setConvForm(v => ({ ...v, link: e.target.value }))} placeholder="https://..."
                      className="w-full py-2 px-3 text-sm text-white outline-none rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Vencimiento (opcional)</p>
                    <input type="date" value={convForm.expires_at} onChange={e => setConvForm(v => ({ ...v, expires_at: e.target.value }))}
                      className="w-full py-2 px-3 text-sm text-white outline-none rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }} />
                  </div>
                </div>
              </div>

              {convError && <p className="text-xs text-red-400">{convError}</p>}
              <button type="submit" disabled={savingConv} className="self-start font-bold text-sm py-2 px-6 rounded-full disabled:opacity-40"
                style={{ background: '#efff42', color: '#000' }}>
                {savingConv ? 'Guardando...' : 'Agregar convención'}
              </button>
            </form>

            {/* Lista */}
            <div className="flex flex-col gap-3">
              {conventions.map(conv => (
                <div key={conv.id} className="rounded-xl p-4 flex gap-4 items-start"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="rounded-lg overflow-hidden flex-shrink-0" style={{ width: 80, height: 80 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={conv.image_url} alt={conv.name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{conv.name || '— sin nombre —'}</p>
                    {conv.country && (
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>🌍 {conv.country}</p>
                    )}
                    {conv.link && (
                      <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{conv.link}</p>
                    )}
                    <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
                      {conv.expires_at ? `Vence: ${new Date(conv.expires_at).toLocaleDateString('es-AR')}` : 'sin vencimiento'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(239,255,66,0.6)' }}>
                      {conv.clicks ?? 0} clicks
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => toggleConv(conv.id, !conv.active)}
                      className="text-xs px-3 py-1 rounded-full font-bold"
                      style={{
                        background: conv.active ? 'rgba(239,255,66,0.1)' : 'rgba(255,255,255,0.05)',
                        border: conv.active ? '1px solid rgba(239,255,66,0.3)' : '1px solid rgba(255,255,255,0.1)',
                        color: conv.active ? '#efff42' : 'rgba(255,255,255,0.3)',
                      }}>
                      {conv.active ? 'activa' : 'inactiva'}
                    </button>
                    <button onClick={() => deleteConv(conv.id)} disabled={deletingConv === conv.id}
                      className="text-xs px-2 py-1 rounded-full disabled:opacity-40"
                      style={{ color: 'rgba(255,100,100,0.6)', border: '1px solid rgba(255,100,100,0.2)' }}>
                      {deletingConv === conv.id ? '...' : 'eliminar'}
                    </button>
                  </div>
                </div>
              ))}
              {conventions.length === 0 && (
                <p className="text-xs text-center py-8" style={{ color: 'rgba(255,255,255,0.15)' }}>No hay convenciones</p>
              )}
            </div>

          </div>

        ) : tab === 'estudios' ? (

          // ── ESTUDIOS ─────────────────────────────────────────────────────────
          <div className="flex flex-col gap-8">

            {/* Formulario nuevo estudio */}
            <form onSubmit={async e => {
              e.preventDefault(); setSavingStudio(true); setStudioError(''); setStudioCreated(null)
              const fd = new FormData()
              Object.entries(studioForm).forEach(([k, v]) => fd.append(k, v))
              if (studioLogo) fd.append('logo', studioLogo)
              const r = await fetch('/api/admin/studios', { method: 'POST', headers: H(pass), body: fd })
              const d = await r.json()
              if (!r.ok) { setStudioError(d.error || 'Error'); setSavingStudio(false); return }
              setAdminStudios(prev => [d.studio, ...prev])
              setStudioCreated({ name: d.studio.name, slug: d.studio.slug, edit_key: d.edit_key })
              setStudioForm({ name: '', slug: '', city: '', country: '', description: '', instagram: '', whatsapp: '', website: '', expires_at: '' })
              setStudioLogo(null); setStudioLogoPreview(null); setStudioIgStatus('idle')
              setSavingStudio(false)
            }}
              className="rounded-xl p-5 flex flex-col gap-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-bold" style={{ color: '#efff42', letterSpacing: '0.08em' }}>NUEVO ESTUDIO</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Logo */}
                <label className="cursor-pointer block">
                  <p className="text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Logo</p>
                  {studioLogoPreview ? (
                    <div className="relative rounded-xl overflow-hidden" style={{ paddingBottom: '60%' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={studioLogoPreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="rounded-xl flex items-center justify-center text-xs"
                      style={{ paddingBottom: '60%', position: 'relative', border: '2px dashed rgba(255,255,255,0.08)' }}>
                      <span className="absolute" style={{ color: 'rgba(255,255,255,0.2)' }}>subir logo</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                    const file = e.target.files?.[0]; if (!file) return
                    setStudioLogoPreview(URL.createObjectURL(file))
                    const img = new window.Image()
                    img.onload = () => {
                      const MAX = 600; let { width, height } = img
                      if (width > MAX || height > MAX) {
                        if (width > height) { height = Math.round(height * MAX / width); width = MAX }
                        else { width = Math.round(width * MAX / height); height = MAX }
                      }
                      const canvas = document.createElement('canvas')
                      canvas.width = width; canvas.height = height
                      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
                      canvas.toBlob(blob => { if (blob) setStudioLogo(new File([blob], 'logo.webp', { type: 'image/webp' })) }, 'image/webp', 0.85)
                    }
                    img.src = URL.createObjectURL(file)
                  }} />
                </label>

                <div className="flex flex-col gap-3">
                  {([
                    { key: 'name', label: 'Nombre *', placeholder: 'Ej: Black Needle Studio' },
                    { key: 'slug', label: 'Slug (URL)', placeholder: 'ej: black-needle (auto si vacío)' },
                    { key: 'city', label: 'Ciudad', placeholder: 'Buenos Aires' },
                    { key: 'country', label: 'País', placeholder: 'Argentina' },
                    { key: 'whatsapp', label: 'WhatsApp', placeholder: '+54911...' },
                    { key: 'website', label: 'Web', placeholder: 'https://...' },
                  ] as const).map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                      <input value={studioForm[key]} onChange={e => setStudioForm(v => ({ ...v, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="w-full py-2 px-3 text-sm text-white outline-none rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                    </div>
                  ))}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Instagram</p>
                      {studioIgStatus === 'checking' && <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>verificando...</span>}
                      {studioIgStatus === 'ok'       && <span className="text-xs font-bold" style={{ color: '#4ade80' }}>✓ disponible</span>}
                      {studioIgStatus === 'taken'    && <span className="text-xs font-bold" style={{ color: '#f87171' }}>✗ ya registrado</span>}
                    </div>
                    <input
                      value={studioForm.instagram}
                      onChange={e => { setStudioForm(v => ({ ...v, instagram: e.target.value })); setStudioIgStatus('idle') }}
                      placeholder="@estudio"
                      className="w-full py-2 px-3 text-sm text-white outline-none rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${studioIgStatus === 'taken' ? 'rgba(248,113,113,0.5)' : studioIgStatus === 'ok' ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.1)'}` }} />
                    {studioIgStatus === 'taken' && (
                      <p className="text-xs leading-relaxed" style={{ color: 'rgba(248,113,113,0.7)', marginTop: 6 }}>
                        Este Instagram ya tiene un perfil en Flashttoo.
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Descripción</p>
                    <textarea value={studioForm.description} onChange={e => setStudioForm(v => ({ ...v, description: e.target.value }))}
                      placeholder="Breve descripción del estudio..."
                      rows={2}
                      className="w-full py-2 px-3 text-sm text-white outline-none rounded-lg resize-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Vencimiento</p>
                    <input type="date" value={studioForm.expires_at} onChange={e => setStudioForm(v => ({ ...v, expires_at: e.target.value }))}
                      className="w-full py-2 px-3 text-sm text-white outline-none rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }} />
                  </div>
                </div>
              </div>

              {studioError && <p className="text-xs text-red-400">{studioError}</p>}

              {studioCreated && (
                <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: 'rgba(239,255,66,0.07)', border: '1px solid rgba(239,255,66,0.2)' }}>
                  <p className="text-xs font-bold" style={{ color: '#efff42' }}>Estudio creado: {studioCreated.name}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>URL: /estudio/{studioCreated.slug}</p>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-bold text-white" style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.15em' }}>{studioCreated.edit_key}</p>
                    <button type="button"
                      onClick={() => { navigator.clipboard.writeText(studioCreated.edit_key).catch(() => {}); setKeyCopied(true); setTimeout(() => setKeyCopied(false), 2000) }}
                      className="text-xs px-3 py-1 rounded-lg"
                      style={{ background: 'rgba(239,255,66,0.15)', color: '#efff42', border: '1px solid rgba(239,255,66,0.3)' }}>
                      {keyCopied ? 'Copiado ✓' : 'Copiar clave'}
                    </button>
                  </div>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Pasale esta clave al dueño del estudio. Visible solo ahora.</p>
                </div>
              )}

              <button type="submit" disabled={savingStudio || !studioForm.name.trim()} className="self-start font-bold text-sm py-2 px-6 rounded-full disabled:opacity-40"
                style={{ background: '#efff42', color: '#000' }}>
                {savingStudio ? 'Guardando...' : 'Crear estudio'}
              </button>
            </form>

            {/* Lista de estudios */}
            <input
              value={studioSearch}
              onChange={e => setStudioSearch(e.target.value)}
              placeholder="Buscar estudio por nombre..."
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
            <div className="flex flex-col gap-3">
              {adminStudios.filter(s => s.name.toLowerCase().includes(studioSearch.toLowerCase())).map(studio => (
                <div key={studio.id} className="rounded-xl p-4 flex items-center gap-4"
                  style={{ background: 'rgba(255,255,255,0.03)', border: studio.visible ? '1px solid rgba(239,255,66,0.2)' : '1px solid rgba(255,255,255,0.07)' }}>
                  {(() => {
                    const daysLeft = studio.expires_at
                      ? Math.ceil((new Date(studio.expires_at).getTime() - Date.now()) / 86400000)
                      : null
                    const expired = daysLeft !== null && daysLeft <= 0
                    const urgent  = daysLeft !== null && daysLeft > 0 && daysLeft <= 7
                    return (
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-bold text-white truncate">{studio.name}</p>
                          {studio.visible && !expired && <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(239,255,66,0.12)', color: '#efff42' }}>Activo</span>}
                          {expired && <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(255,80,80,0.15)', color: '#f87171' }}>Vencido</span>}
                        </div>
                        <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>/estudio/{studio.slug}{studio.city ? ` · ${studio.city}` : ''}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.15)', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.1em' }}>clave: {studio.edit_key}</p>
                          {daysLeft !== null && (
                            <p className="text-xs font-bold" style={{ color: expired ? '#f87171' : urgent ? '#fbbf24' : 'rgba(255,255,255,0.3)' }}>
                              {expired ? `venció hace ${Math.abs(daysLeft)}d` : `vence en ${daysLeft}d`}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{studio.profile_views ?? 0} vis</span>
                          <span className="text-xs" style={{ color: '#c084fc' }}>{studio.instagram_clicks ?? 0} IG</span>
                          <span className="text-xs" style={{ color: '#4ade80' }}>{studio.whatsapp_clicks ?? 0} WA</span>
                          <span className="text-xs" style={{ color: '#60a5fa' }}>{studio.website_clicks ?? 0} Web</span>
                        </div>
                        {studio.studio_artists && studio.studio_artists.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {studio.studio_artists.map(sa => sa.artists && (
                              <span key={sa.artist_id} className="text-xs px-2 py-0.5 rounded-full"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)' }}>
                                {sa.artists.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={async () => {
                        const next = !studio.visible
                        await fetch(`/api/admin/studios/${studio.id}`, { method: 'PATCH', headers: { ...H(pass), 'Content-Type': 'application/json' }, body: JSON.stringify({ visible: next }) })
                        setAdminStudios(prev => prev.map(s => s.id === studio.id ? { ...s, visible: next } : s))
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg font-bold"
                      style={{ background: studio.visible ? 'rgba(255,80,80,0.12)' : 'rgba(239,255,66,0.1)', color: studio.visible ? '#f87171' : '#efff42', border: `1px solid ${studio.visible ? 'rgba(255,80,80,0.2)' : 'rgba(239,255,66,0.2)'}` }}>
                      {studio.visible ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`¿Eliminar "${studio.name}"?`)) return
                        await fetch(`/api/admin/studios/${studio.id}`, { method: 'DELETE', headers: H(pass) })
                        setAdminStudios(prev => prev.filter(s => s.id !== studio.id))
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: 'rgba(255,80,80,0.06)', color: 'rgba(255,100,100,0.5)', border: '1px solid rgba(255,80,80,0.12)' }}>
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
              {adminStudios.length === 0 && (
                <p className="text-xs text-center py-8" style={{ color: 'rgba(255,255,255,0.15)' }}>No hay estudios creados aún</p>
              )}
            </div>

          </div>

        ) : tab === 'idiomas' ? (

          // ── IDIOMAS ──────────────────────────────────────────────────────────
          <div className="flex flex-col gap-5" style={{ maxWidth: 700 }}>

            {/* Header */}
            <div className="flex items-center justify-between gap-3">
              {idiomaLang ? (
                <button onClick={() => { setIdiomaLang(null); setIdiomaEsKeys([]); setIdiomaEdits({}) }}
                  className="text-sm font-bold flex items-center gap-2"
                  style={{ color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  ← Idiomas
                </button>
              ) : (
                <p className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {langs.length} idioma{langs.length !== 1 ? 's' : ''}
                </p>
              )}
              {!idiomaLang && (
                <button onClick={() => setAddLangOpen(true)}
                  className="text-xs font-bold px-4 py-2 rounded-lg"
                  style={{ background: 'rgba(239,255,66,0.12)', border: '1px solid rgba(239,255,66,0.3)', color: '#efff42', cursor: 'pointer' }}>
                  + Idioma
                </button>
              )}
            </div>

            {/* Modal agregar idioma */}
            {addLangOpen && (
              <div className="rounded-xl p-4 flex flex-col gap-3"
                style={{ background: 'rgba(239,255,66,0.05)', border: '1px solid rgba(239,255,66,0.2)' }}>
                <p className="text-sm font-bold" style={{ color: '#efff42' }}>Nuevo idioma</p>
                <div className="flex gap-2">
                  <input placeholder="Código (ej: en)" value={newLang.code}
                    onChange={e => setNewLang(p => ({ ...p, code: e.target.value.toLowerCase().slice(0, 5) }))}
                    className="flex-1 py-2 px-3 text-sm text-white outline-none rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <input placeholder="Nombre (ej: English)" value={newLang.name}
                    onChange={e => setNewLang(p => ({ ...p, name: e.target.value }))}
                    className="flex-1 py-2 px-3 text-sm text-white outline-none rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <input placeholder="Bandera 🇺🇸" value={newLang.flag}
                    onChange={e => setNewLang(p => ({ ...p, flag: e.target.value }))}
                    className="w-28 py-2 px-3 text-sm text-white outline-none rounded-lg text-center"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
                <div className="flex gap-2">
                  <button onClick={async () => {
                    if (!newLang.code || !newLang.name) return
                    setAddingLang(true)
                    const r = await fetch('/api/admin/languages', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(newLang),
                    })
                    const d = await r.json()
                    if (d.language) setLangs(prev => [...prev, d.language])
                    setNewLang({ code: '', name: '', flag: '' })
                    setAddLangOpen(false)
                    setAddingLang(false)
                  }} disabled={addingLang || !newLang.code || !newLang.name}
                    className="flex-1 py-2 rounded-lg text-sm font-bold"
                    style={{ background: '#efff42', color: '#000', border: 'none', cursor: 'pointer', opacity: addingLang ? 0.5 : 1 }}>
                    {addingLang ? 'Creando...' : 'Crear'}
                  </button>
                  <button onClick={() => { setAddLangOpen(false); setNewLang({ code: '', name: '', flag: '' }) }}
                    className="px-4 py-2 rounded-lg text-sm"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {!idiomaLang ? (
              /* ── Lista de idiomas ── */
              <div className="flex flex-col gap-3">
                {langs.map(lang => (
                  <div key={lang.code} className="rounded-xl p-4 flex flex-col gap-3"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>

                    {/* Fila principal */}
                    <div className="flex items-center gap-4">
                      <span style={{ fontSize: 26 }}>{lang.flag || '🌐'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-white">{lang.name}</p>
                          {lang.code === 'es' && (
                            <span className="text-xs px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(239,255,66,0.12)', color: '#efff42' }}>Madre</span>
                          )}
                          {!lang.active && (
                            <span className="text-xs px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}>Inactivo</span>
                          )}
                        </div>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{lang.code}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {lang.code !== 'es' && (
                          <button onClick={async () => {
                            await fetch(`/api/admin/languages/${lang.code}`, {
                              method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ active: !lang.active }),
                            })
                            setLangs(prev => prev.map(l => l.code === lang.code ? { ...l, active: !l.active } : l))
                          }}
                            className="text-xs px-3 py-1.5 rounded-lg"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                            {lang.active ? 'Desactivar' : 'Activar'}
                          </button>
                        )}
                        <button onClick={() => {
                          if (editingLangCode === lang.code) { setEditingLangCode(null); return }
                          setEditingLangCode(lang.code)
                          setEditingLangVals({ code: lang.code, name: lang.name, flag: lang.flag })
                        }}
                          className="text-xs px-3 py-1.5 rounded-lg"
                          style={{ background: editingLangCode === lang.code ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                          {editingLangCode === lang.code ? 'Cancelar' : 'Editar'}
                        </button>
                        <button onClick={() => openLang(lang.code)}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg"
                          style={{ background: 'rgba(239,255,66,0.1)', border: '1px solid rgba(239,255,66,0.25)', color: '#efff42', cursor: 'pointer' }}>
                          Traducciones
                        </button>
                      </div>
                    </div>

                    {/* Formulario inline de edición */}
                    {editingLangCode === lang.code && (
                      <div className="flex gap-2 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <input
                          placeholder="Código (ej: en)"
                          value={editingLangVals.code}
                          onChange={e => setEditingLangVals(p => ({ ...p, code: e.target.value.toLowerCase().slice(0, 5) }))}
                          className="flex-1 py-2 px-3 text-sm text-white outline-none rounded-lg"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                        <input
                          placeholder="Nombre"
                          value={editingLangVals.name}
                          onChange={e => setEditingLangVals(p => ({ ...p, name: e.target.value }))}
                          className="flex-1 py-2 px-3 text-sm text-white outline-none rounded-lg"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                        <input
                          placeholder="🏳️"
                          value={editingLangVals.flag}
                          onChange={e => setEditingLangVals(p => ({ ...p, flag: e.target.value }))}
                          className="w-20 py-2 px-3 text-sm text-white outline-none rounded-lg text-center"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                        <button
                          disabled={savingLangMeta}
                          onClick={async () => {
                            setSavingLangMeta(true)
                            await fetch(`/api/admin/languages/${lang.code}`, {
                              method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ code: editingLangVals.code, name: editingLangVals.name, flag: editingLangVals.flag }),
                            })
                            setLangs(prev => prev.map(l => l.code === lang.code
                              ? { ...l, code: editingLangVals.code, name: editingLangVals.name, flag: editingLangVals.flag }
                              : l))
                            setSavingLangMeta(false)
                            setEditingLangCode(null)
                          }}
                          className="px-4 py-2 rounded-lg text-sm font-bold"
                          style={{ background: '#efff42', color: '#000', border: 'none', cursor: 'pointer', opacity: savingLangMeta ? 0.5 : 1 }}>
                          {savingLangMeta ? '...' : 'Guardar'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {langs.length === 0 && (
                  <p className="text-sm text-center py-8" style={{ color: 'rgba(255,255,255,0.15)' }}>
                    Sin idiomas. El español se agrega automáticamente al correr el SQL.
                  </p>
                )}
              </div>
            ) : (
              /* ── Editor de traducciones ── */
              <div className="flex flex-col gap-3">
                <div className="rounded-xl p-3 flex items-center gap-3"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <span style={{ fontSize: 22 }}>{langs.find(l => l.code === idiomaLang)?.flag || '🌐'}</span>
                  <div>
                    <p className="text-sm font-bold text-white">{langs.find(l => l.code === idiomaLang)?.name}</p>
                    {idiomaLang === 'es' && (
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Idioma madre — editás los valores base</p>
                    )}
                    {idiomaLang !== 'es' && (
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Los campos vacíos muestran el texto en español</p>
                    )}
                  </div>
                </div>

                {TRANS_SECTIONS.map(sec => {
                  const secKeys = idiomaEsKeys.filter(k => k.section === sec.key)
                  const isOpen = idiomaOpen.has(sec.key)
                  const filledCount = secKeys.filter(k => idiomaEdits[sec.key]?.[k.key]?.trim()).length
                  const allFilled = secKeys.length > 0 && filledCount === secKeys.length
                  return (
                    <div key={sec.key} className="rounded-xl overflow-hidden"
                      style={{ border: `1px solid ${allFilled ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.07)'}` }}>
                      {/* Sección header */}
                      <button
                        onClick={() => setIdiomaOpen(prev => {
                          const next = new Set(prev)
                          if (next.has(sec.key)) next.delete(sec.key)
                          else next.add(sec.key)
                          return next
                        })}
                        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
                        style={{ background: isOpen ? 'rgba(239,255,66,0.05)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', border: 'none' }}>
                        <span className="text-sm font-bold" style={{ color: isOpen ? '#efff42' : 'rgba(255,255,255,0.7)' }}>{sec.label}</span>
                        <div className="flex items-center gap-2">
                          {secKeys.length > 0 && (
                            <span className="text-xs font-bold tabular-nums" style={{ color: allFilled ? '#4ade80' : filledCount > 0 ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)' }}>
                              {filledCount}/{secKeys.length}
                            </span>
                          )}
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{isOpen ? '▲' : '▼'}</span>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="flex flex-col gap-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          {secKeys.map(k => {
                            const filled = !!(idiomaEdits[sec.key]?.[k.key]?.trim())
                            return (
                              <div key={k.key} className="px-4 py-3 flex flex-col gap-1.5"
                              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <div className="flex items-center gap-2">
                                <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: filled ? '#4ade80' : 'rgba(255,255,255,0.12)' }} />
                                <code className="text-xs px-1.5 py-0.5 rounded"
                                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                                  {k.key}
                                </code>
                                {idiomaLang !== 'es' && (
                                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                    ES: {k.value}
                                  </span>
                                )}
                              </div>
                              {k.value.length > 100 ? (
                                <textarea
                                  value={idiomaEdits[sec.key]?.[k.key] ?? ''}
                                  onChange={e => setIdiomaEdits(prev => ({
                                    ...prev,
                                    [sec.key]: { ...prev[sec.key], [k.key]: e.target.value },
                                  }))}
                                  placeholder={idiomaLang !== 'es' ? k.value : ''}
                                  rows={10}
                                  className="w-full py-2 px-3 text-sm text-white outline-none rounded-lg"
                                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', transition: 'border-color 0.15s', resize: 'vertical', lineHeight: 1.7, fontFamily: 'monospace', fontSize: 12 }}
                                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(239,255,66,0.4)')}
                                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                                />
                              ) : (
                                <input
                                  value={idiomaEdits[sec.key]?.[k.key] ?? ''}
                                  onChange={e => setIdiomaEdits(prev => ({
                                    ...prev,
                                    [sec.key]: { ...prev[sec.key], [k.key]: e.target.value },
                                  }))}
                                  placeholder={idiomaLang !== 'es' ? k.value : ''}
                                  className="w-full py-1.5 px-3 text-sm text-white outline-none rounded-lg"
                                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', transition: 'border-color 0.15s' }}
                                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(239,255,66,0.4)')}
                                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                                />
                              )}
                            </div>
                            )
                          })}
                          <div className="px-4 py-3 flex justify-end">
                            <button
                              onClick={() => saveIdiomaSection(sec.key)}
                              disabled={idiomaSaving === sec.key}
                              className="text-xs font-bold px-4 py-2 rounded-lg"
                              style={{ background: '#efff42', color: '#000', border: 'none', cursor: 'pointer', opacity: idiomaSaving === sec.key ? 0.5 : 1 }}>
                              {idiomaSaving === sec.key ? 'Guardando...' : 'Guardar sección'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

          </div>

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
                  <AdField label="Ciudad">
                    <input value={adForm.city} onChange={e => setAdForm(f => ({ ...f, city: e.target.value }))}
                      placeholder="Buenos Aires" className={iCls} />
                  </AdField>
                  <AdField label="País">
                    <input value={adForm.country} onChange={e => setAdForm(f => ({ ...f, country: e.target.value }))}
                      placeholder="Argentina" className={iCls} />
                  </AdField>
                  <AdField label="Instagram">
                    <input value={adForm.instagram} onChange={e => setAdForm(f => ({ ...f, instagram: e.target.value }))}
                      placeholder="@estudioroma" className={iCls} />
                  </AdField>
                  <AdField label="WhatsApp">
                    <input value={adForm.whatsapp} onChange={e => setAdForm(f => ({ ...f, whatsapp: e.target.value }))}
                      placeholder="+54911..." className={iCls} />
                  </AdField>
                  <AdField label="Sitio web">
                    <input value={adForm.website} onChange={e => setAdForm(f => ({ ...f, website: e.target.value }))}
                      placeholder="https://..." className={iCls} />
                  </AdField>
                  <AdField label="Link directo (opcional)">
                    <input value={adForm.link} onChange={e => setAdForm(f => ({ ...f, link: e.target.value }))}
                      placeholder="https://..." className={iCls} />
                  </AdField>
                  <AdField label="Vencimiento (opcional)">
                    <input type="date" value={adForm.expires_at} onChange={e => setAdForm(f => ({ ...f, expires_at: e.target.value }))}
                      className={iCls} style={{ colorScheme: 'dark' }} />
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
                <div key={ad.id} className="rounded-xl p-4 flex flex-col gap-3"
                  style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${ad.active ? 'rgba(239,255,66,0.12)' : 'rgba(255,255,255,0.06)'}` }}>
                  <div className="flex items-center gap-4">
                    <div className="shrink-0 rounded-lg overflow-hidden" style={{ width: 72, height: 52 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{ad.title}</p>
                      <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {[ad.city, ad.country].filter(Boolean).join(', ') || 'global'}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#efff42', opacity: 0.7 }}>{ad.clicks} clicks</p>
                      {ad.expires_at && (() => {
                        const exp = new Date(ad.expires_at)
                        const expired = exp < new Date()
                        const days = Math.ceil((exp.getTime() - Date.now()) / 86400000)
                        return (
                          <p className="text-xs mt-0.5" style={{ color: expired ? '#f87171' : days <= 7 ? '#fb923c' : 'rgba(255,255,255,0.3)' }}>
                            {expired ? `venció hace ${-days}d` : `vence en ${days}d`}
                          </p>
                        )
                      })()}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      <button onClick={() => toggleAdGlobal(ad.id, ad.show_global)}
                        className="text-xs px-3 py-1 rounded-full transition-all"
                        style={{
                          border: `1px solid ${ad.show_global ? 'rgba(96,165,250,0.35)' : 'rgba(255,255,255,0.1)'}`,
                          color: ad.show_global ? '#60a5fa' : 'rgba(255,255,255,0.25)',
                          background: ad.show_global ? 'rgba(96,165,250,0.08)' : 'transparent',
                        }}
                        title="Mostrar en el inicio (sin búsqueda)">
                        {ad.show_global ? 'en inicio' : 'sin inicio'}
                      </button>
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
                  {/* Ciudad / país editable */}
                  {editingAd?.id === ad.id ? (
                    <div className="flex items-center gap-2 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <input
                        value={editingAd.city}
                        onChange={e => setEditingAd(v => v && ({ ...v, city: e.target.value }))}
                        placeholder="Ciudad"
                        className="flex-1 py-1 px-2 text-xs text-white outline-none rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)' }}
                      />
                      <input
                        value={editingAd.country}
                        onChange={e => setEditingAd(v => v && ({ ...v, country: e.target.value }))}
                        placeholder="País"
                        className="flex-1 py-1 px-2 text-xs text-white outline-none rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)' }}
                      />
                      <input
                        type="date"
                        value={editingAd.expires_at}
                        onChange={e => setEditingAd(v => v && ({ ...v, expires_at: e.target.value }))}
                        title="Vencimiento (opcional)"
                        className="py-1 px-2 text-xs text-white outline-none rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', colorScheme: 'dark', width: 110 }}
                      />
                      <button onClick={saveAdLocation} disabled={savingAdEdit}
                        className="text-xs px-3 py-1 rounded-full font-bold disabled:opacity-40"
                        style={{ background: 'rgba(239,255,66,0.1)', border: '1px solid rgba(239,255,66,0.3)', color: '#efff42' }}>
                        {savingAdEdit ? '...' : 'ok'}
                      </button>
                      <button onClick={() => setEditingAd(null)}
                        className="text-xs px-2 py-1 rounded-full"
                        style={{ color: 'rgba(255,255,255,0.25)' }}>✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingAd({ id: ad.id, city: ad.city || '', country: ad.country || '', expires_at: ad.expires_at ? ad.expires_at.slice(0, 10) : '' })}
                      className="text-left pt-1 w-full"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: 11, color: (!ad.city || !ad.country) ? 'rgba(255,100,100,0.5)' : 'rgba(255,255,255,0.2)' }}>
                      {(!ad.city || !ad.country)
                        ? '⚠ sin ciudad/país — clic para editar'
                        : `${ad.city}, ${ad.country} — editar`}
                    </button>
                  )}

                  {/* Clave de edición */}
                  <div className="flex items-center gap-3 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="flex-1">
                      <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Clave del anunciante</p>
                      <p style={{ fontSize: 13, fontFamily: 'monospace', color: ad.edit_key ? 'rgba(239,255,66,0.7)' : 'rgba(255,255,255,0.15)', letterSpacing: '0.12em' }}>
                        {ad.edit_key || '— sin clave —'}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        const r = await fetch(`/api/admin/ads/${ad.id}`, { method: 'PATCH', headers: { ...H(pass), 'Content-Type': 'application/json' }, body: JSON.stringify({ regen_key: true }) })
                        const d = await r.json()
                        if (d.ad) setAds(prev => prev.map(a => a.id === ad.id ? { ...a, edit_key: d.ad.edit_key } : a))
                      }}
                      className="text-xs px-3 py-1 rounded-full"
                      style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' }}>
                      nueva clave
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de estadísticas */}
      {statsV2Sp && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 90, background: '#0a0a0a', overflowY: 'auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 0', position: 'sticky', top: 0, background: '#0a0a0a', zIndex: 1 }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0 }}>Estadísticas</p>
            <button
              onClick={() => { setStatsV2Sp(null); setStatsV2Data(null) }}
              style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ✕
            </button>
          </div>

          {statsV2Loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
              <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>Cargando...</p>
            </div>
          ) : statsV2Data && (() => {
            const { sponsor, totals, monthly } = statsV2Data
            const entries = Object.entries(monthly)
            const maxVal = Math.max(1, ...entries.flatMap(([, d]) => [d.detail_open, d.banner_click, d.detail_click]))
            return (
              <div style={{ maxWidth: 480, margin: '0 auto', padding: '28px 20px 60px', display: 'flex', flexDirection: 'column', gap: 28 }}>

                {/* Logo + nombre */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, paddingTop: 8 }}>
                  <div style={{
                    width: 160, height: 64,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: sponsor.keep_color ? '#fff' : 'rgba(255,255,255,0.04)',
                    borderRadius: 16, padding: '10px 20px',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={sponsor.logo_url} alt={sponsor.name} style={{
                      maxHeight: `${sponsor.logo_scale || 100}%`, maxWidth: '100%', objectFit: 'contain',
                      filter: sponsor.keep_color ? 'none' : 'brightness(0) invert(1)',
                    }} />
                  </div>
                  <p style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>{sponsor.name}</p>
                </div>

                {/* Totales */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {([
                    { label: 'Vistas\ndetalle', value: totals.detail_open, color: '#60a5fa' },
                    { label: 'Clics\nbanner', value: totals.banner_click, color: '#34d399' },
                    { label: 'Clics\ndetalle', value: totals.detail_click, color: '#efff42' },
                  ] as { label: string; value: number; color: string }[]).map(({ label, value, color }) => (
                    <div key={label} style={{
                      background: 'rgba(255,255,255,0.03)', borderRadius: 16,
                      padding: '18px 12px', textAlign: 'center',
                      border: `1px solid ${color}20`,
                    }}>
                      <p style={{ fontSize: 34, fontWeight: 900, color, margin: '0 0 6px', lineHeight: 1 }}>{value}</p>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{label}</p>
                    </div>
                  ))}
                </div>

                {/* Gráfico de barras — últimos 6 meses */}
                <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: '20px 16px 16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.16em', textTransform: 'uppercase', margin: '0 0 4px' }}>Últimos 6 meses</p>

                  {/* Promedios mensuales */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 20 }}>
                    {([
                      { label: 'Prom. vistas', value: fmtAvg(totals.detail_open), color: '#60a5fa' },
                      { label: 'Prom. clic banner', value: fmtAvg(totals.banner_click), color: '#34d399' },
                      { label: 'Prom. clic detalle', value: fmtAvg(totals.detail_click), color: '#efff42' },
                    ] as { label: string; value: string; color: string }[]).map(({ label, value, color }) => (
                      <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 8px', textAlign: 'center', border: `1px solid ${color}15` }}>
                        <p style={{ fontSize: 20, fontWeight: 800, color, margin: '0 0 3px', lineHeight: 1 }}>{value}</p>
                        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', margin: 0, lineHeight: 1.4 }}>{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Barras */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                    {entries.map(([key, data]) => {
                      const detailH  = Math.round((data.detail_open  / maxVal) * 72)
                      const bannerH  = Math.round((data.banner_click / maxVal) * 72)
                      const dClickH  = Math.round((data.detail_click / maxVal) * 72)
                      const empty = data.detail_open === 0 && data.banner_click === 0 && data.detail_click === 0
                      return (
                        <div key={key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          {/* Números */}
                          <div style={{ width: '100%', display: 'flex', gap: 1, justifyContent: 'center', marginBottom: 2 }}>
                            {empty ? (
                              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.1)', lineHeight: 1 }}>—</span>
                            ) : (
                              <>
                                {data.detail_open  > 0 && <span style={{ flex: 1, fontSize: 7, fontWeight: 700, color: '#60a5fa', textAlign: 'center', lineHeight: 1 }}>{data.detail_open}</span>}
                                {data.banner_click > 0 && <span style={{ flex: 1, fontSize: 7, fontWeight: 700, color: '#34d399', textAlign: 'center', lineHeight: 1 }}>{data.banner_click}</span>}
                                {data.detail_click > 0 && <span style={{ flex: 1, fontSize: 7, fontWeight: 700, color: '#efff42', textAlign: 'center', lineHeight: 1 }}>{data.detail_click}</span>}
                              </>
                            )}
                          </div>
                          {/* Barras */}
                          <div style={{ width: '100%', display: 'flex', gap: 1, alignItems: 'flex-end', height: 72 }}>
                            <div style={{ flex: 1, background: '#60a5fa', borderRadius: '3px 3px 0 0', height: Math.max(detailH, data.detail_open  > 0 ? 3 : 0), minHeight: 0 }} />
                            <div style={{ flex: 1, background: '#34d399', borderRadius: '3px 3px 0 0', height: Math.max(bannerH, data.banner_click > 0 ? 3 : 0), minHeight: 0 }} />
                            <div style={{ flex: 1, background: '#efff42', borderRadius: '3px 3px 0 0', height: Math.max(dClickH, data.detail_click > 0 ? 3 : 0), minHeight: 0 }} />
                          </div>
                          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', margin: 0, letterSpacing: '0.04em' }}>{monthLabel(key)}</p>
                        </div>
                      )
                    })}
                  </div>

                  {/* Leyenda */}
                  <div style={{ display: 'flex', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
                    {([
                      { color: '#60a5fa', label: 'Vistas detalle' },
                      { color: '#34d399', label: 'Clics banner' },
                      { color: '#efff42', label: 'Clics detalle' },
                    ] as { color: string; label: string }[]).map(({ color, label }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Nota */}
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', textAlign: 'center', margin: 0, lineHeight: 1.6 }}>
                  El seguimiento de vistas del detalle comenzó a registrarse a partir de ahora.{'\n'}Los clics al enlace incluyen el historial completo.
                </p>

              </div>
            )
          })()}
        </div>
      )}
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
