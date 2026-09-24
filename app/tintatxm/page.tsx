'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { INTERVIEW_QUESTIONS } from '@/lib/interview'
import StudioPanel from '@/components/StudioPanel'
import { renderPhraseContent } from '@/components/PhraseContent'
import { useTranslation } from '@/contexts/TranslationContext'
import CulturaVideosAdmin from '@/components/CulturaVideosAdmin'
import InsumosVideoAdmin from '@/components/InsumosVideoAdmin'

type DayVisit = { date: string; count: number }
type Visit = { from: string; to: string; city: string; country: string }
type InstallStats = { days: DayVisit[]; byPlatform: { ios: number; android: number; other: number }; total: number }

type Artist = {
  id: string; name: string; city: string; country: string
  photo_url: string; instagram: string | null; whatsapp: string | null
  email: string | null; auth_email: string | null
  bio: string | null; styles: string[] | null
  interview: Record<string, string> | null
  gallery_photo_1: string | null; gallery_photo_2: string | null; gallery_photo_3: string | null
  profile_views: number; instagram_clicks: number; whatsapp_clicks: number; likes: number
  edit_key: string; visible: boolean; created_at: string; status: string
  pending_reason: string | null; migrated_at: string | null
  flashbook_alias: string | null
  invited_by_name: string | null; invited_by_admin: boolean; invites_disabled: boolean
}

function fmtN(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.0', '') + 'k'
  return String(n)
}

// Solo para que el link de /reclamar se vea personalizado al compartirlo —
// no es la identidad real, esa sigue siendo el id al final de la URL
function slugifyName(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'tatuador'
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
  id: string; name: string; logo_url: string | null; bg_image_url: string | null
  detail_logo_url: string | null; detail_logo_mode: string | null
  description: string | null; link: string | null; level: string
  city: string | null; country: string | null; active: boolean
  keep_color: boolean; starts_at: string; expires_at: string | null
  created_at: string; notes: string | null; clicks: number; logo_scale: number | null
  grid_logo_scale: number | null; whatsapp: string | null
  bio: string | null; instagram: string | null; bg_image_dark: number | null; logo_bg_color: string | null
  slug: string | null; auth_email: string | null; linked_from: string | null
  daily_post_limit: number | null; user_id: string | null
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

function SponsorDailyLimitEditor({ sponsorId, value, pass, onSaved }: { sponsorId: string; value: number | null; pass: string; onSaved: (v: number | null) => void }) {
  const [draft, setDraft] = useState(value == null ? '' : String(value))
  const [saving, setSaving] = useState(false)

  const save = async () => {
    const parsed = draft.trim() === '' ? null : parseInt(draft, 10)
    const clean = parsed !== null && Number.isFinite(parsed) && parsed >= 0 ? parsed : null
    setSaving(true)
    try {
      const r = await fetch(`/api/admin/sponsors-v2/${sponsorId}`, {
        method: 'PATCH',
        headers: { ...H(pass), 'Content-Type': 'application/json' },
        body: JSON.stringify({ daily_post_limit: clean }),
      })
      if (r.ok) { onSaved(clean); setDraft(clean == null ? '' : String(clean)) }
    } finally { setSaving(false) }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>Límite de mensajes/día</span>
      <input
        type="number" min={0} value={draft} placeholder="sin límite"
        onChange={e => setDraft(e.target.value)}
        className="w-20 px-2 py-1 rounded-lg text-xs"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', outline: 'none' }} />
      <button
        disabled={saving}
        onClick={save}
        className="text-xs font-bold px-2.5 py-1 rounded-lg disabled:opacity-50"
        style={{ background: 'rgba(239,255,66,0.1)', color: '#efff42', border: '1px solid rgba(239,255,66,0.25)' }}>
        {saving ? '...' : 'Guardar'}
      </button>
    </div>
  )
}

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
  const [done, setDone]         = useState<{ name: string; id: string; claim_code: string; instagram?: string } | null>(null)
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
      setDone({ name: form.name.trim(), id: d.artist.id, claim_code: d.artist.claim_code, instagram: d.artist.instagram })
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

  if (done) {
    const claimUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://flashttoo.com'}/reclamar/${slugifyName(done.name)}/${done.claim_code}`
    return (
    <div className="max-w-sm flex flex-col gap-4">
      <div className="rounded-xl p-5" style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)' }}>
        <p className="text-sm font-bold mb-1" style={{ color: '#4ade80' }}>Tatuador agregado (borrador)</p>
        <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {done.name} está guardado pero todavía no es visible en el buscador. Mandale este link — ahí ve su perfil como vista previa y lo activa poniendo mail y contraseña.
        </p>
        <p className="text-xs mb-2 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Link para activar el perfil</p>
        <div className="flex gap-2">
          <span className="flex-1 py-2 px-3 rounded-lg text-xs truncate"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
            {claimUrl}
          </span>
          <button onClick={() => { navigator.clipboard.writeText(claimUrl); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000) }}
            className="px-4 rounded-lg text-xs font-bold shrink-0"
            style={{ background: linkCopied ? 'rgba(74,222,128,0.15)' : 'rgba(239,255,66,0.1)', border: `1px solid ${linkCopied ? 'rgba(74,222,128,0.4)' : 'rgba(239,255,66,0.3)'}`, color: linkCopied ? '#4ade80' : '#efff42' }}>
            {linkCopied ? '✓' : 'copiar'}
          </button>
        </div>
      </div>
      <button onClick={reset} className="w-full py-2.5 rounded-xl text-sm font-bold"
        style={{ background: '#efff42', color: '#000' }}>
        Agregar otro
      </button>
    </div>
    )
  }

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

// Perfiles creados como borrador (todavía sin reclamar) — para volver a
// encontrar el link de activación de alguien que ya se agregó antes
function DraftArtistsList({ pass }: { pass: string }) {
  const [drafts, setDrafts] = useState<{ id: string; name: string; city: string | null; country: string | null; created_at: string; claim_code: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/artists?status=draft&limit=200&offset=0', { headers: H(pass) })
      .then(r => r.json())
      .then(d => setDrafts(d.artists ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [pass])

  if (loading) return null
  if (drafts.length === 0) return null

  return (
    <div className="max-w-sm flex flex-col gap-3">
      <p className="text-xs uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
        Borradores sin reclamar ({drafts.length})
      </p>
      <div className="flex flex-col gap-2">
        {drafts.map(d => {
          const claimUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://flashttoo.com'}/reclamar/${slugifyName(d.name)}/${d.claim_code}`
          return (
            <div key={d.id} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm font-bold truncate" style={{ color: '#fff' }}>{d.name}</p>
                {(d.city || d.country) && (
                  <span className="text-xs shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>{[d.city, d.country].filter(Boolean).join(', ')}</span>
                )}
              </div>
              <div className="flex gap-2">
                <span className="flex-1 py-1.5 px-2.5 rounded-lg text-xs truncate"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
                  {claimUrl}
                </span>
                <button onClick={() => { navigator.clipboard.writeText(claimUrl); setCopiedId(d.id); setTimeout(() => setCopiedId(null), 2000) }}
                  className="px-3 rounded-lg text-xs font-bold shrink-0"
                  style={{ background: copiedId === d.id ? 'rgba(74,222,128,0.15)' : 'rgba(239,255,66,0.1)', border: `1px solid ${copiedId === d.id ? 'rgba(74,222,128,0.4)' : 'rgba(239,255,66,0.3)'}`, color: copiedId === d.id ? '#4ade80' : '#efff42' }}>
                  {copiedId === d.id ? '✓' : 'copiar'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}


function ArtistGrid({ artists, deleting, onDelete, onToggleVisible, onUpdateKey, onUpdateEmail, onToggleInvites }: { artists: Artist[]; deleting: string | null; onDelete: (id: string) => void; onToggleVisible: (id: string, visible: boolean) => void; onUpdateKey: (id: string, key: string) => void; onUpdateEmail?: (id: string, email: string) => void; onToggleInvites?: (id: string, invites_disabled: boolean) => void }) {
  const [editingKey, setEditingKey] = useState<{ id: string; value: string } | null>(null)
  const [savingKey, setSavingKey] = useState(false)
  const [editingEmail, setEditingEmail] = useState<{ id: string; value: string } | null>(null)
  const [savingEmail, setSavingEmail] = useState(false)
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
                {a.auth_email && (
                  editingEmail?.id === a.id ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        value={editingEmail.value}
                        onChange={e => setEditingEmail({ id: a.id, value: e.target.value })}
                        onKeyDown={async e => {
                          if (e.key === 'Enter') {
                            setSavingEmail(true)
                            await onUpdateEmail?.(a.id, editingEmail.value)
                            setEditingEmail(null); setSavingEmail(false)
                          }
                          if (e.key === 'Escape') setEditingEmail(null)
                        }}
                        autoFocus
                        className="py-0.5 px-2 rounded text-xs font-bold outline-none"
                        style={{ background: 'rgba(239,255,66,0.08)', border: '1px solid rgba(239,255,66,0.35)', color: '#efff42', minWidth: 160 }}
                      />
                      <button onClick={async () => { setSavingEmail(true); await onUpdateEmail?.(a.id, editingEmail.value); setEditingEmail(null); setSavingEmail(false) }}
                        disabled={savingEmail}
                        className="text-xs px-2 py-0.5 rounded font-bold shrink-0 disabled:opacity-40"
                        style={{ background: 'rgba(239,255,66,0.12)', border: '1px solid rgba(239,255,66,0.3)', color: '#efff42' }}>
                        {savingEmail ? '...' : 'ok'}
                      </button>
                      <button onClick={() => setEditingEmail(null)}
                        className="text-xs px-1.5 py-0.5 rounded shrink-0"
                        style={{ color: 'rgba(255,255,255,0.25)' }}>✕</button>
                    </div>
                  ) : (
                    <button onClick={() => onUpdateEmail && setEditingEmail({ id: a.id, value: a.auth_email! })}
                      className="inline-block text-xs font-bold px-2 py-0.5 rounded-full mt-1 transition-opacity hover:opacity-70"
                      style={{ background: 'rgba(239,255,66,0.1)', color: '#efff42', border: '1px solid rgba(239,255,66,0.25)' }}
                      title={onUpdateEmail ? 'Corregir mail (typo)' : undefined}>
                      ✉ {a.auth_email}
                    </button>
                  )
                )}
                {a.migrated_at && (Date.now() - new Date(a.migrated_at).getTime() < 30 * 24 * 60 * 60 * 1000) && (
                  <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-full mt-1 ml-1" style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}>
                    ✓ migró
                  </span>
                )}
                {a.invited_by_name && (
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    Perfil invitado por {a.invited_by_admin ? 'Flashttoo' : a.invited_by_name}
                  </p>
                )}
                {isDupe(a) && <p className="text-xs font-bold" style={{ color: '#f87171' }}>⚠ duplicado</p>}
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => onToggleVisible(a.id, a.visible === false)}
                  className="text-xs px-2.5 py-1 rounded-lg"
                  style={{ border: `1px solid ${a.visible === false ? 'rgba(255,200,0,0.3)' : 'rgba(255,255,255,0.1)'}`, color: a.visible === false ? 'rgba(255,200,0,0.7)' : 'rgba(255,255,255,0.3)' }}>
                  {a.visible === false ? 'mostrar' : 'ocultar'}
                </button>
                {onToggleInvites && (
                  <button onClick={() => onToggleInvites(a.id, !a.invites_disabled)}
                    className="text-xs px-2.5 py-1 rounded-lg"
                    style={{ border: `1px solid ${a.invites_disabled ? 'rgba(255,80,80,0.3)' : 'rgba(255,255,255,0.1)'}`, color: a.invites_disabled ? 'rgba(255,100,100,0.7)' : 'rgba(255,255,255,0.3)' }}
                    title="Cortar o reactivar la posibilidad de este tatuador de generar invitaciones">
                    {a.invites_disabled ? 'reactivar inv.' : 'cortar inv.'}
                  </button>
                )}
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
              {a.flashbook_alias && (
                <a href={`/flash/${a.flashbook_alias}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs px-2.5 py-1 rounded-lg shrink-0"
                  style={{ background: 'rgba(239,255,66,0.08)', border: '1px solid rgba(239,255,66,0.25)', color: '#efff42', textDecoration: 'none' }}>
                  ver flashbook
                </a>
              )}
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
function StatsPanel({ artists, visits, installs, studios, searchStats, appEventCounts, pass, onResetSearch, onResetAppEvent, onResetArtistClicks }: { artists: Artist[]; visits: DayVisit[]; installs: InstallStats; studios: StudioStat[]; searchStats: { countries: SearchStat[]; cities: SearchStat[]; styles: SearchStat[] }; appEventCounts: Record<string, number>; pass: string; onResetSearch: () => void; onResetAppEvent: (key: string) => void; onResetArtistClicks: (field: string) => void }) {
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
            const W = 300, H = 90, PX = 8, PY = 16
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
                    className="w-full" style={{ height: 90, display: 'block' }}>
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
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 90, pointerEvents: 'none' }}>
                    {pts.map((p, i) => p.count > 0 ? (
                      <span key={i} style={{
                        position: 'absolute',
                        left: `${(p.x / W) * 100}%`,
                        top: Math.max(1, p.y - 11),
                        transform: 'translateX(-50%)',
                        fontSize: 7,
                        color: 'rgba(239,255,66,0.7)',
                        fontWeight: 700,
                        lineHeight: 1,
                        whiteSpace: 'nowrap',
                      }}>{p.count}</span>
                    ) : null)}
                  </div>
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
        <p style={sectionLabel}>Tatuadores</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            { label: 'Tatuadores', value: artists.length, color: '#efff42',               field: null },
            { label: 'Visitas',    value: totalViews,     color: 'rgba(255,255,255,0.7)', field: null },
            { label: 'Clicks IG',  value: totalIG,        color: '#c084fc',               field: 'instagram_clicks' },
            { label: 'Clicks WA',  value: totalWA,        color: '#4ade80',               field: 'whatsapp_clicks' },
          ]).map(item => (
            <div key={item.label} className="p-4" style={card}>
              <p className="font-bold" style={{ fontSize: 28, color: item.color, lineHeight: 1 }}>{fmtN(item.value)}</p>
              <p className="mt-1.5" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{item.label}</p>
              {item.field && (
                <button onClick={() => onResetArtistClicks(item.field!)}
                  style={{ marginTop: 6, fontSize: 10, color: 'rgba(255,80,80,0.5)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  Reiniciar
                </button>
              )}
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={sectionLabel}>Búsquedas realizadas</p>
            <button
              onClick={async () => {
                if (!confirm('¿Reiniciar todas las búsquedas a 0?')) return
                await fetch('/api/admin/search-stats', { method: 'DELETE', headers: { 'x-admin-pass': pass } })
                onResetSearch()
              }}
              style={{ fontSize: 11, color: 'rgba(255,80,80,0.6)', background: 'none', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 8, padding: '3px 10px', cursor: 'pointer' }}>
              Reiniciar
            </button>
          </div>
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
                <button
                  onClick={() => onResetAppEvent(key)}
                  style={{ marginTop: 6, fontSize: 10, color: 'rgba(255,80,80,0.5)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                  Reiniciar
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

    </div>
  )
}

export default function AdminPage() {
  const { t, language } = useTranslation()
  const [pass, setPass]       = useState('')
  const [pin, setPin]         = useState('')
  const [auth, setAuth]       = useState(false)
  const [tab, setTab]         = useState<'artistas' | 'ads' | 'stats' | 'pendientes' | 'config' | 'contenido' | 'agregar' | 'sponsors2' | 'convenciones' | 'estudios' | 'idiomas' | 'frases' | 'comunidad' | 'culturavideos' | 'insumosvideo'>('artistas')
  const [artists, setArtists]       = useState<Artist[]>([])
  const [artistsTotal, setArtistsTotal] = useState(0)
  const [artistsOffset, setArtistsOffset] = useState(0)
  const [loadingMoreArtists, setLoadingMoreArtists] = useState(false)
  const ARTISTS_PAGE = 10
  const [statsArtists, setStatsArtists] = useState<Artist[]>([])
  const [loadingStats, setLoadingStats] = useState(false)
  const [loadingPending, setLoadingPending] = useState(false)
  const [copiedMsg, setCopiedMsg] = useState<string | null>(null)
  const [editingIG, setEditingIG] = useState<string | null>(null)
  const [editIGValue, setEditIGValue] = useState('')
  const [savingIG, setSavingIG] = useState(false)
  const [loadingArtists, setLoadingArtists] = useState(false)
  const [showMigrated, setShowMigrated] = useState(false)
  const [migratedArtists, setMigratedArtists] = useState<Artist[]>([])
  const [loadingMigrated, setLoadingMigrated] = useState(false)
  const [showHidden, setShowHidden] = useState(false)
  const [hiddenArtists, setHiddenArtists] = useState<Artist[]>([])
  const [loadingHidden, setLoadingHidden] = useState(false)
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
  const [flashLimit, setFlashLimit]     = useState(10)
  const [flashLimitInput, setFlashLimitInput] = useState('10')
  const [savingFlashLimit, setSavingFlashLimit] = useState(false)
  const [moderation, setModeration] = useState(false)
  const [savingMod, setSavingMod]   = useState(false)
  const [showCount, setShowCount]   = useState(false)
  const [savingShowCount, setSavingShowCount] = useState(false)
  const [galleryEnabled, setGalleryEnabled]             = useState(false)
  const [savingGallery, setSavingGallery]               = useState(false)
  const [eventsCountryFilter, setEventsCountryFilter]   = useState(false)
  const [savingEventsCountry, setSavingEventsCountry]   = useState(false)
  const [showInsumos, setShowInsumos]                   = useState(true)
  const [savingShowInsumos, setSavingShowInsumos]       = useState(false)
  const [maintenanceMode, setMaintenanceMode]           = useState(false)
  const [savingMaintenance, setSavingMaintenance]       = useState(false)

  const [showContactInfo, setShowContactInfo]           = useState(true)
  const [savingContactInfo, setSavingContactInfo]       = useState(false)
  const [showClickCounters, setShowClickCounters]       = useState(false)
  const [savingClickCounters, setSavingClickCounters]   = useState(false)
  const [registrationOpen, setRegistrationOpen]         = useState(true)
  const [savingRegistration, setSavingRegistration]     = useState(false)
  const [verifyIG, setVerifyIG]                         = useState('')
  const [verifyWA, setVerifyWA]                         = useState('')
  const [savingVerify, setSavingVerify]                 = useState(false)
  const [wordSearch, setWordSearch]                     = useState('')
  const [previewArtist, setPreviewArtist]               = useState<Artist | null>(null)
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
  const [bannerGap, setBannerGap]             = useState(8)
  const [savingBannerGap, setSavingBannerGap] = useState(false)
  const [sponsorV2Form, setSponsorV2Form]     = useState({ name: '', category: '', bio: '', instagram: '', whatsapp: '', link: '', level: 'global', city: '', country: '', expires_at: '', notes: '', logo_scale: 100, grid_logo_scale: 100 })
  const [editingPendingId, setEditingPendingId] = useState<string | null>(null)
  const [expandedPendingId, setExpandedPendingId] = useState<string | null>(null)
  const [linkTargetId, setLinkTargetId] = useState('')
  const [linkingPending, setLinkingPending] = useState(false)
  const [sponsorV2Logo, setSponsorV2Logo]     = useState<File | null>(null)
  const [sponsorV2LogoPreview, setSponsorV2LogoPreview] = useState<string | null>(null)
  const [sponsorV2ProfileLogo, setSponsorV2ProfileLogo] = useState<File | null>(null)
  const [sponsorV2ProfileLogoPreview, setSponsorV2ProfileLogoPreview] = useState<string | null>(null)
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
    { key: 'cultura',    label: 'Cultura — Artículos y contenido' },
    { key: 'insumos',    label: 'Insumos — Proveedores' },
    { key: 'ingresar',   label: 'Ingresar — Modal de login y registro' },
    { key: 'activar',    label: 'Activar — Página de activación de perfil' },
    { key: 'password',   label: 'Password — Página de nueva contraseña' },
    { key: 'galeria',        label: 'Galería — Overlay de fotos' },
    { key: 'comunidad',      label: 'Comunidad — Feed de publicaciones' },
    { key: 'artist_menu',    label: 'Menú del artista — Opciones del perfil' },
    { key: 'turnos_libres',  label: 'Turnos libres — Disponibilidad' },
    { key: 'disponibilidad', label: 'Disponibilidad — Página pública compartida' },
    { key: 'meses',          label: 'Meses — Nombres del calendario' },
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
  const [statsV2Sp, setStatsV2Sp]             = useState<SponsorV2Admin | null>(null)
  const [statsV2Data, setStatsV2Data]         = useState<StatsV2Data | null>(null)
  const [statsV2Loading, setStatsV2Loading]   = useState(false)
  const [editV2Form, setEditV2Form]           = useState({ name: '', category: '', bio: '', instagram: '', whatsapp: '', link: '', level: 'global', city: '', country: '', expires_at: '', notes: '', logo_scale: 100, grid_logo_scale: 100, bg_image_dark: 0, logo_bg_color: '' })
  const [insumoBgImages, setInsumoBgImages]   = useState<string[]>([])
  const [uploadingBg, setUploadingBg]         = useState(false)
  const [savingEditV2, setSavingEditV2]       = useState(false)
  const [editV2BgFile, setEditV2BgFile]         = useState<File | null>(null)
  const [editV2BgPreview, setEditV2BgPreview]   = useState<string | null>(null)
  const [editV2BgClear, setEditV2BgClear]       = useState(false)
  const [editV2ProfileLogoFile, setEditV2ProfileLogoFile] = useState<File | null>(null)
  const [editV2ProfileLogoPreview, setEditV2ProfileLogoPreview] = useState<string | null>(null)
  const [editV2ProfileLogoClear, setEditV2ProfileLogoClear] = useState(false)
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
  type AdminStudio = { id: string; name: string; slug: string; city: string | null; country: string | null; visible: boolean; edit_key: string; claim_code?: string | null; created_at: string; expires_at: string | null; profile_views: number; instagram_clicks: number; whatsapp_clicks: number; website_clicks: number; auth_email?: string | null; user_id?: string | null; studio_artists?: AdminStudioArtist[] }
  const [adminStudios, setAdminStudios]       = useState<AdminStudio[]>([])
  const [loadingStudios, setLoadingStudios]   = useState(false)

  // Frases
  type PhraseLink = { label: string; url: string }
  type AdminPhrase = { id: string; image_url: string; description: string | null; language_code: string; active: boolean; created_at: string; comment_count?: number; tags?: string[]; links?: PhraseLink[]; view_count?: number; external_view_count?: number; publish_at?: string | null; slug?: string | null }
  type AdminPhraseComment = { id: string; artist_name: string | null; guest_name: string | null; guest_emoji: string | null; content: string; created_at: string }
  const [adminPhrases, setAdminPhrases]       = useState<AdminPhrase[]>([])
  const [loadingPhrases, setLoadingPhrases]   = useState(false)
  type CulturaEditor = { id: string; email: string; name: string; password_plain?: string | null; created_at: string }
  const [culturaEditors, setCulturaEditors]   = useState<CulturaEditor[]>([])
  const [loadingEditors, setLoadingEditors]   = useState(false)
  const [editorForm, setEditorForm]           = useState({ email: '', name: '', password: '' })
  const [savingEditor, setSavingEditor]       = useState(false)
  const [editorError, setEditorError]         = useState('')
  const [editorFormOpen, setEditorFormOpen]   = useState(false)
  const [showPassFor, setShowPassFor]         = useState<string | null>(null)
  const PHRASE_TAGS = ['tatuaje','técnica','cultura','arte','diseño','cuidados','minimalista','color','tradicional','blackwork','realismo','geometría','lettering','historia','inspiración','guía']
  const TAG_LABELS: Record<string, Record<string, string>> = {
    tatuaje:     { es: 'tatuaje',     en: 'tattoo',      pt: 'tatuagem' },
    técnica:     { es: 'técnica',     en: 'technique',   pt: 'técnica' },
    cultura:     { es: 'cultura',     en: 'culture',     pt: 'cultura' },
    arte:        { es: 'arte',        en: 'art',         pt: 'arte' },
    diseño:      { es: 'diseño',      en: 'design',      pt: 'design' },
    cuidados:    { es: 'cuidados',    en: 'aftercare',   pt: 'cuidados' },
    minimalista: { es: 'minimalista', en: 'minimalist',  pt: 'minimalista' },
    color:       { es: 'color',       en: 'color',       pt: 'cor' },
    tradicional: { es: 'tradicional', en: 'traditional', pt: 'tradicional' },
    blackwork:   { es: 'blackwork',   en: 'blackwork',   pt: 'blackwork' },
    realismo:    { es: 'realismo',    en: 'realism',     pt: 'realismo' },
    geometría:   { es: 'geometría',   en: 'geometry',    pt: 'geometria' },
    lettering:   { es: 'lettering',   en: 'lettering',   pt: 'lettering' },
    historia:    { es: 'historia',    en: 'history',     pt: 'história' },
    inspiración: { es: 'inspiración', en: 'inspiration', pt: 'inspiração' },
    guía:        { es: 'guía',        en: 'guide',       pt: 'guia' },
  }
  const tagLabel = (tag: string) => TAG_LABELS[tag]?.[language] ?? tag
  const [phraseForm, setPhraseForm]           = useState({ description: '', language_code: 'es', publish_at: '' })
  const [phraseScheduled, setPhraseScheduled] = useState(false)
  const [phraseTags, setPhraseTags]           = useState<string[]>([])
  const [showPhraseLinkForm, setShowPhraseLinkForm] = useState(false)
  const [phraseLinkFormVal, setPhraseLinkFormVal]   = useState({ url: '', label: '' })
  const [showEditLinkForm, setShowEditLinkForm]     = useState(false)
  const [editLinkFormVal, setEditLinkFormVal]       = useState({ url: '', label: '' })
  const [editPhraseTags, setEditPhraseTags]   = useState<string[]>([])
  const [newTagInput, setNewTagInput]         = useState('')
  const [editNewTagInput, setEditNewTagInput] = useState('')
  const [extraPhraseTags, setExtraPhraseTags]         = useState<string[]>([])
  const [editExtraPhraseTags, setEditExtraPhraseTags] = useState<string[]>([])
  const phraseDescRef = useRef<HTMLTextAreaElement>(null)
  function insertPhrasePrefix(prefix: string) {
    const ta = phraseDescRef.current; if (!ta) return
    const start = ta.selectionStart
    const lineStart = ta.value.lastIndexOf('\n', start - 1) + 1
    const newVal = ta.value.slice(0, lineStart) + prefix + ta.value.slice(lineStart)
    setPhraseForm(f => ({ ...f, description: newVal }))
    setTimeout(() => { ta.focus(); ta.setSelectionRange(lineStart + prefix.length, lineStart + prefix.length) }, 0)
  }
  function insertPhraseText(text: string) {
    const ta = phraseDescRef.current; if (!ta) return
    const start = ta.selectionStart, end = ta.selectionEnd
    const newVal = ta.value.slice(0, start) + text + ta.value.slice(end)
    setPhraseForm(f => ({ ...f, description: newVal }))
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + text.length, start + text.length) }, 0)
  }
  function wrapPhraseText(before: string, after: string) {
    const ta = phraseDescRef.current; if (!ta) return
    const start = ta.selectionStart, end = ta.selectionEnd
    const sel = ta.value.slice(start, end) || 'texto'
    const newVal = ta.value.slice(0, start) + before + sel + after + ta.value.slice(end)
    setPhraseForm(f => ({ ...f, description: newVal }))
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + before.length, start + before.length + sel.length) }, 0)
  }
  // Edit phrase
  const [editPhraseId, setEditPhraseId]       = useState<string | null>(null)
  const [editPhraseDesc, setEditPhraseDesc]   = useState('')
  const [editPhraseLang, setEditPhraseLang]   = useState('es')
  const [editPhrasePublishAt, setEditPhrasePublishAt] = useState('')
  const [savingEditPhrase, setSavingEditPhrase] = useState(false)
  const editPhraseDescRef  = useRef<HTMLTextAreaElement>(null)
  const phraseImgInputRef  = useRef<HTMLInputElement>(null)
  const editImgInputRef    = useRef<HTMLInputElement>(null)
  const [uploadingImg, setUploadingImg] = useState(false)

  async function uploadContentImg(file: File, insertFn: (text: string) => void) {
    setUploadingImg(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const r = await fetch('/api/admin/upload-image', { method: 'POST', headers: { 'x-admin-pass': pass }, body: fd })
      const d = await r.json()
      if (d.url) insertFn(`[img:${d.url}]`)
    } finally { setUploadingImg(false) }
  }

  function insertEditPrefix(prefix: string) {
    const ta = editPhraseDescRef.current; if (!ta) return
    const start = ta.selectionStart
    const lineStart = ta.value.lastIndexOf('\n', start - 1) + 1
    const newVal = ta.value.slice(0, lineStart) + prefix + ta.value.slice(lineStart)
    setEditPhraseDesc(newVal)
    setTimeout(() => { ta.focus(); ta.setSelectionRange(lineStart + prefix.length, lineStart + prefix.length) }, 0)
  }
  function insertEditText(text: string) {
    const ta = editPhraseDescRef.current; if (!ta) return
    const start = ta.selectionStart, end = ta.selectionEnd
    const newVal = ta.value.slice(0, start) + text + ta.value.slice(end)
    setEditPhraseDesc(newVal)
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + text.length, start + text.length) }, 0)
  }
  function wrapEditText(before: string, after: string) {
    const ta = editPhraseDescRef.current; if (!ta) return
    const start = ta.selectionStart, end = ta.selectionEnd
    const sel = ta.value.slice(start, end) || 'texto'
    const newVal = ta.value.slice(0, start) + before + sel + after + ta.value.slice(end)
    setEditPhraseDesc(newVal)
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + before.length, start + before.length + sel.length) }, 0)
  }
  const [phraseImage, setPhraseImage]         = useState<File | null>(null)
  const [phrasePreview, setPhrasePreview]     = useState<string | null>(null)
  const [savingPhrase, setSavingPhrase]       = useState(false)
  const [phraseError, setPhraseError]         = useState('')
  const [expandedPhraseId, setExpandedPhraseId] = useState<string | null>(null)
  const [phraseComments, setPhraseCommentsAdmin] = useState<Record<string, AdminPhraseComment[]>>({})
  const [loadingPhraseComments, setLoadingPhraseComments] = useState<string | null>(null)
  const [studioSearch, setStudioSearch]       = useState('')
  const [studioExpiryEdits, setStudioExpiryEdits] = useState<Record<string, string>>({})
  const [studioExpirySaving, setStudioExpirySaving] = useState<Record<string, boolean>>({})
  const [previewStudioSlug, setPreviewStudioSlug] = useState<string | null>(null)
  const [studioForm, setStudioForm]           = useState({ name: '', slug: '', city: '', country: '', description: '', instagram: '', whatsapp: '', website: '', expires_at: '' })
  const [studioLogo, setStudioLogo]           = useState<File | null>(null)
  const [studioLogoPreview, setStudioLogoPreview] = useState<string | null>(null)
  const [savingStudio, setSavingStudio]       = useState(false)
  const [studioError, setStudioError]         = useState('')
  const [studioCreated, setStudioCreated]     = useState<{ name: string; id: string; claim_code: string } | null>(null)
  const [studioFormOpen, setStudioFormOpen]   = useState(false)
  const [keyCopied, setKeyCopied]             = useState(false)
  const [copiedLinkLang, setCopiedLinkLang]   = useState<string | null>(null)
  const [copiedStudioLink, setCopiedStudioLink] = useState<string | null>(null)
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
    if (pin.length !== 3) { setError('Contraseña incorrecta'); return }
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
      fetch('/api/admin/insumos-bg', { headers: H(p) }).then(r => r.json()),
    ]).then(([a, b, v, cfg, ins, sp, sp2, conv, stu, ibg]) => {
      if (a.status === 'fulfilled') {
        setArtists((a.value.artists || []).filter((x: Artist) => x.status !== 'pending'))
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
        if (typeof sp2.value.banner_gap === 'number') setBannerGap(sp2.value.banner_gap)
      }
      if (conv.status === 'fulfilled') setConventions(conv.value.conventions || [])
      if (stu.status === 'fulfilled') setAdminStudios(stu.value.studios || [])
      if (ibg.status === 'fulfilled') setInsumoBgImages(ibg.value.urls || [])
      if (cfg.status === 'fulfilled') {
        const fl = typeof cfg.value.settings?.flash_limit === 'number' ? cfg.value.settings.flash_limit : 10
        setFlashLimit(fl); setFlashLimitInput(String(fl))
        setModeration(cfg.value.settings?.moderation === true)
        setShowCount(cfg.value.settings?.show_count === true)
        setGalleryEnabled(cfg.value.settings?.artist_gallery_enabled === true)
        setEventsCountryFilter(cfg.value.settings?.events_country_filter === true)
        setShowInsumos(cfg.value.settings?.show_insumos !== false)
        setMaintenanceMode(cfg.value.settings?.maintenance_mode === true)

        setShowContactInfo(cfg.value.settings?.show_contact_info !== false)
        setShowClickCounters(cfg.value.settings?.show_click_counters === true)
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

  const [refreshingSponsorsV2, setRefreshingSponsorsV2] = useState(false)
  const refreshSponsorsV2 = async () => {
    setRefreshingSponsorsV2(true)
    try {
      const r = await fetch('/api/admin/sponsors-v2', { headers: H(pass) }).then(res => res.json()).catch(() => null)
      if (r?.sponsors) setSponsorsV2(r.sponsors)
    } finally { setRefreshingSponsorsV2(false) }
  }

  const [revokingAccessId, setRevokingAccessId] = useState<string | null>(null)
  const revokeSponsorAccess = async (id: string) => {
    if (!confirm('¿Borrar el acceso de esta marca? El mail y contraseña dejan de funcionar (ese mail queda libre), pero el perfil (logo, bio, fotos) se mantiene intacto en el listado.')) return
    setRevokingAccessId(id)
    try {
      const r = await fetch(`/api/admin/sponsors-v2/${id}/revoke-access`, { method: 'POST', headers: H(pass) })
      const d = await r.json()
      if (r.ok) setSponsorsV2(prev => prev.map(x => x.id === id ? d.sponsor : x))
    } finally { setRevokingAccessId(null) }
  }
  const renderSponsorV2Row = (sp: SponsorV2Admin) => {
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
                          style={{ width: 80, height: 32, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.07)' }}>
                          {sp.logo_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={sp.logo_url} alt={sp.name} style={{ maxHeight: 26, maxWidth: 72, objectFit: 'contain', filter: sp.keep_color ? 'none' : 'brightness(0) invert(1)', opacity: sp.keep_color ? 1 : 0.6 }} />
                          ) : (
                            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>Sin logo</span>
                          )}
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
                        {sp.auth_email && (
                          <p className="text-xs" style={{ color: 'rgba(239,255,66,0.6)' }}>
                            {sp.auth_email}
                          </p>
                        )}
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
                          setEditV2BgFile(null); setEditV2BgPreview(null); setEditV2BgClear(false)
                          setEditV2ProfileLogoFile(null); setEditV2ProfileLogoPreview(null); setEditV2ProfileLogoClear(false)
                          setEditV2Form({
                            name: sp.name,
                            category: sp.description || '',
                            bio: sp.bio || '',
                            instagram: sp.instagram || '',
                            whatsapp: sp.whatsapp || '',
                            link: sp.link || '',
                            level: sp.level,
                            city: sp.city || '',
                            country: sp.country || '',
                            expires_at: sp.expires_at ? sp.expires_at.slice(0, 10) : '',
                            notes: sp.notes || '',
                            logo_scale: sp.logo_scale || 100,
                            grid_logo_scale: sp.grid_logo_scale || 100,
                            bg_image_dark: sp.bg_image_dark ?? 0,
                            logo_bg_color: sp.logo_bg_color || '',
                          })
                        }}
                        className="text-xs px-3 py-1 rounded-full transition-all"
                        style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)' }}>
                        editar
                      </button>
                      <a href={`/proveedor/${sp.id}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs px-3 py-1 rounded-full"
                        style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>
                        preview ↗
                      </a>
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

                      {/* Imagen de fondo */}
                      <div>
                        <p className="text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Imagen de fondo del perfil</p>
                        <div className="flex items-center gap-3">
                          <label className="cursor-pointer">
                            {(editV2BgPreview || (sp.bg_image_url && !editV2BgClear)) ? (
                              <div className="rounded-lg overflow-hidden" style={{ width: 80, height: 50, border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={editV2BgPreview || sp.bg_image_url!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                {editV2BgPreview && <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(239,255,66,0.15)', color: '#efff42' }}>nueva</span>}
                              </div>
                            ) : (
                              <div className="rounded-lg flex items-center justify-center text-xs" style={{ width: 80, height: 50, border: '2px dashed rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.2)' }}>
                                sin foto
                              </div>
                            )}
                            <input type="file" accept="image/*" className="hidden"
                              onChange={e => {
                                const file = e.target.files?.[0]; if (!file) return
                                setEditV2BgFile(file)
                                setEditV2BgPreview(URL.createObjectURL(file))
                                setEditV2BgClear(false)
                              }} />
                          </label>
                          <div className="flex flex-col gap-1.5">
                            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                              {editV2BgPreview ? 'Foto nueva seleccionada' : editV2BgClear ? 'Se borrará al guardar' : 'Tocar para cambiar'}
                            </span>
                            {(editV2BgPreview || (sp.bg_image_url && !editV2BgClear)) && (
                              <button type="button"
                                onClick={() => { setEditV2BgFile(null); setEditV2BgPreview(null); setEditV2BgClear(true) }}
                                className="text-xs text-left"
                                style={{ color: 'rgba(255,80,80,0.6)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                Borrar imagen
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Logo de perfil (grilla) */}
                      <div>
                        <p className="text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Logo de perfil <span style={{ color: 'rgba(255,255,255,0.2)', textTransform: 'none' }}>(reemplaza al logo en la grilla)</span></p>
                        <div className="flex items-center gap-3">
                          <label className="cursor-pointer">
                            {(editV2ProfileLogoPreview || (sp.detail_logo_url && !editV2ProfileLogoClear)) ? (
                              <div className="rounded-lg overflow-hidden flex items-center justify-center" style={{ width: 100, height: 40, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={editV2ProfileLogoPreview || sp.detail_logo_url!} alt="" style={{ maxHeight: 32, maxWidth: 90, objectFit: 'contain' }} />
                                {editV2ProfileLogoPreview && <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(239,255,66,0.15)', color: '#efff42' }}>nueva</span>}
                              </div>
                            ) : (
                              <div className="rounded-lg flex items-center justify-center text-xs" style={{ width: 100, height: 40, border: '2px dashed rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.2)' }}>
                                sin logo
                              </div>
                            )}
                            <input type="file" accept="image/*" className="hidden"
                              onChange={e => {
                                const file = e.target.files?.[0]; if (!file) return
                                setEditV2ProfileLogoFile(file)
                                setEditV2ProfileLogoPreview(URL.createObjectURL(file))
                                setEditV2ProfileLogoClear(false)
                              }} />
                          </label>
                          {(editV2ProfileLogoPreview || (sp.detail_logo_url && !editV2ProfileLogoClear)) && (
                            <button type="button"
                              onClick={() => { setEditV2ProfileLogoFile(null); setEditV2ProfileLogoPreview(null); setEditV2ProfileLogoClear(true) }}
                              className="text-xs" style={{ color: 'rgba(255,80,80,0.6)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                              Borrar logo
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Oscurecimiento imagen de fondo */}
                      {(editV2BgPreview || (sp.bg_image_url && !editV2BgClear)) && (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Oscurecer imagen de fondo</p>
                            <span className="text-xs font-bold" style={{ color: '#efff42' }}>{editV2Form.bg_image_dark}%</span>
                          </div>
                          <input type="range" min={0} max={80} step={5} value={editV2Form.bg_image_dark}
                            onChange={e => setEditV2Form(f => ({ ...f, bg_image_dark: parseInt(e.target.value, 10) }))}
                            className="w-full" />
                        </div>
                      )}

                      <div>
                        <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Países (separar con coma, vacío = todos)</p>
                        <input value={editV2Form.country} onChange={e => setEditV2Form(f => ({ ...f, country: e.target.value }))}
                          placeholder="Argentina, Chile, Uruguay..." className={iCls} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Nombre</p>
                          <input value={editV2Form.name} onChange={e => setEditV2Form(f => ({ ...f, name: e.target.value }))} className={iCls} />
                        </div>
                        <div>
                          <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Categoría</p>
                          <input value={editV2Form.category} onChange={e => setEditV2Form(f => ({ ...f, category: e.target.value }))} placeholder="tinta, cremas, agujas..." className={iCls} />
                        </div>
                        <div>
                          <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Link</p>
                          <input value={editV2Form.link} onChange={e => setEditV2Form(f => ({ ...f, link: e.target.value }))} placeholder="https://..." className={iCls} />
                        </div>
                        <div>
                          <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Vencimiento</p>
                          <input type="date" value={editV2Form.expires_at} onChange={e => setEditV2Form(f => ({ ...f, expires_at: e.target.value }))} className={iCls} style={{ colorScheme: 'dark' }} />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Notas internas</p>
                        <textarea value={editV2Form.notes} rows={2}
                          onChange={e => setEditV2Form(f => ({ ...f, notes: e.target.value }))}
                          placeholder="Precio acordado, contacto, condiciones..."
                          className={iCls} style={{ resize: 'none', lineHeight: 1.6 }} />
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Bio / Historia</p>
                        <textarea value={editV2Form.bio} rows={3}
                          onChange={e => setEditV2Form(f => ({ ...f, bio: e.target.value }))}
                          placeholder="Historia de la marca..."
                          className={iCls} style={{ resize: 'none', lineHeight: 1.6 }} />
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Instagram (sin @)</p>
                        <input value={editV2Form.instagram} onChange={e => setEditV2Form(f => ({ ...f, instagram: e.target.value }))}
                          placeholder="nombredemarca" className={iCls} />
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>WhatsApp</p>
                        <input value={editV2Form.whatsapp} onChange={e => setEditV2Form(f => ({ ...f, whatsapp: e.target.value }))}
                          placeholder="+54 9 11 1234 5678" className={iCls} />
                      </div>
                      {/* Tamaño del logo */}
                      <div className="flex flex-col gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Tamaño en banner</p>
                            <span className="text-xs font-bold" style={{ color: '#efff42' }}>{editV2Form.logo_scale}%</span>
                          </div>
                          <input type="range" min={50} max={150} step={5} value={editV2Form.logo_scale}
                            onChange={e => setEditV2Form(f => ({ ...f, logo_scale: parseInt(e.target.value, 10) }))}
                            className="w-full" />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Tamaño en grilla</p>
                            <span className="text-xs font-bold" style={{ color: '#efff42' }}>{editV2Form.grid_logo_scale}px</span>
                          </div>
                          <input type="range" min={30} max={150} step={5} value={editV2Form.grid_logo_scale}
                            onChange={e => setEditV2Form(f => ({ ...f, grid_logo_scale: parseInt(e.target.value, 10) }))}
                            className="w-full" />
                        </div>
                      </div>

                      {/* Color del círculo del logo */}
                      <div>
                        <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Círculo de fondo del logo</p>
                        <div className="flex items-center gap-3">
                          <div className="rounded-full flex items-center justify-center" style={{
                            width: 44, height: 44,
                            background: editV2Form.logo_bg_color || 'rgba(255,255,255,0.04)',
                            border: editV2Form.logo_bg_color ? 'none' : '2px dashed rgba(255,255,255,0.1)',
                          }} />
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="color" value={editV2Form.logo_bg_color || '#ffffff'}
                              onChange={e => setEditV2Form(f => ({ ...f, logo_bg_color: e.target.value }))}
                              style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'none', padding: 0 }} />
                            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                              {editV2Form.logo_bg_color || 'Sin círculo'}
                            </span>
                          </label>
                          {editV2Form.logo_bg_color && (
                            <button type="button" onClick={() => setEditV2Form(f => ({ ...f, logo_bg_color: '' }))}
                              className="text-xs" style={{ color: 'rgba(255,80,80,0.6)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                              Quitar
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end">
                        <button type="button" onClick={() => setEditingV2(null)}
                          className="px-4 py-2 rounded-lg text-xs"
                          style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)' }}>
                          Cancelar
                        </button>
                        <button type="button" disabled={savingEditV2}
                          onClick={async () => {
                            setSavingEditV2(true)
                            const jsonBase = {
                              name: editV2Form.name.trim(),
                              description: editV2Form.category.trim() || null,
                              bio: editV2Form.bio.trim() || null,
                              instagram: editV2Form.instagram.trim() || null,
                              whatsapp: editV2Form.whatsapp.trim() || null,
                              link: editV2Form.link.trim() || null,
                              level: editV2Form.country.trim() ? 'country' : 'global',
                              city: null as null,
                              country: editV2Form.country.trim() || null,
                              keep_color: true,
                              detail_logo_mode: 'color',
                              expires_at: editV2Form.expires_at ? new Date(editV2Form.expires_at).toISOString() : null,
                              notes: editV2Form.notes.trim() || null,
                              logo_scale: editV2Form.logo_scale,
                              grid_logo_scale: editV2Form.grid_logo_scale,
                              bg_image_dark: editV2Form.bg_image_dark,
                              logo_bg_color: editV2Form.logo_bg_color || null,
                            }
                            let r: Response
                            if (editV2BgFile || editV2ProfileLogoFile) {
                              const fd = new FormData()
                              if (editV2BgFile) fd.append('bg_image', editV2BgFile)
                              if (editV2ProfileLogoFile) fd.append('detail_logo', editV2ProfileLogoFile)
                              for (const [k, v] of Object.entries(jsonBase)) fd.append(k, v === null ? '' : String(v))
                              r = await fetch(`/api/admin/sponsors-v2/${sp.id}`, { method: 'PATCH', headers: H(pass), body: fd })
                            } else {
                              const jsonFull = editV2BgClear ? { ...jsonBase, bg_image_url: null } : jsonBase
                              r = await fetch(`/api/admin/sponsors-v2/${sp.id}`, {
                                method: 'PATCH',
                                headers: { ...H(pass), 'Content-Type': 'application/json' },
                                body: JSON.stringify(editV2ProfileLogoClear ? { ...jsonFull, detail_logo_url: null } : jsonFull),
                              })
                            }
                            const d = await r.json()
                            if (d.sponsor) setSponsorsV2(prev => prev.map(s => s.id === sp.id ? d.sponsor : s))
                            setEditingV2(null)
                            setEditV2BgFile(null); setEditV2BgPreview(null); setEditV2BgClear(false)
                            setEditV2ProfileLogoFile(null); setEditV2ProfileLogoPreview(null); setEditV2ProfileLogoClear(false)
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
  }


  useEffect(() => {
    if ((!['idiomas', 'estudios'].includes(tab)) || !auth) return
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
      setArtists(prev => [...prev.filter(a => a.status === 'pending'), ...r.artists.filter((a: Artist) => a.status !== 'pending')])
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

  useEffect(() => {
    if (!auth || !pass) return
    refreshPending(pass)
    const iv = setInterval(() => refreshPending(pass), 30_000)
    return () => clearInterval(iv)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, pass])

  const refreshStudios = async (p: string) => {
    setLoadingStudios(true)
    const d = await fetch('/api/admin/studios', { headers: H(p) }).then(r => r.json()).catch(() => ({}))
    if (d.studios) setAdminStudios(d.studios)
    setLoadingStudios(false)
  }

  const handleStudioLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setStudioLogoPreview(URL.createObjectURL(file))
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
      canvas.toBlob(blob => { if (blob) setStudioLogo(new File([blob], 'logo.webp', { type: 'image/webp' })) }, 'image/webp', 0.82)
    }
    img.src = URL.createObjectURL(file)
  }

  const saveStudio = async (e: { preventDefault: () => void }) => {
    e.preventDefault(); setStudioError('')
    if (!studioLogo) { setStudioError('Agregá un logo'); return }
    if (!studioForm.name.trim() || !studioForm.city.trim() || !studioForm.country.trim()) { setStudioError('Nombre, ciudad y país son obligatorios'); return }
    setSavingStudio(true)
    try {
      const fd = new FormData()
      fd.append('logo', studioLogo)
      fd.append('name', studioForm.name.trim())
      fd.append('city', studioForm.city.trim())
      fd.append('country', studioForm.country.trim())
      fd.append('description', studioForm.description.trim())
      fd.append('instagram', studioForm.instagram.trim())
      fd.append('whatsapp', studioForm.whatsapp.trim())
      fd.append('website', studioForm.website.trim())
      const r = await fetch('/api/admin/studios', { method: 'POST', headers: H(pass), body: fd })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Error')
      setAdminStudios(prev => [d.studio, ...prev])
      setStudioCreated({ name: studioForm.name.trim(), id: d.studio.id, claim_code: d.studio.claim_code })
    } catch (err: unknown) {
      setStudioError(err instanceof Error ? err.message : 'Error')
    } finally { setSavingStudio(false) }
  }

  const resetStudioForm = () => {
    setStudioForm({ name: '', slug: '', city: '', country: '', description: '', instagram: '', whatsapp: '', website: '', expires_at: '' })
    setStudioLogo(null); setStudioLogoPreview(null); setStudioCreated(null); setStudioError(''); setStudioFormOpen(false)
  }

  const [editingStudioEmail, setEditingStudioEmail] = useState<{ id: string; value: string } | null>(null)
  const [savingStudioEmail, setSavingStudioEmail] = useState(false)
  const updateStudioEmail = async (id: string, email: string) => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return
    setSavingStudioEmail(true)
    try {
      const r = await fetch(`/api/admin/studios/${id}/fix-email`, {
        method: 'POST', headers: { ...H(pass), 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        alert(`Error al corregir mail: ${d.error || r.status}`)
        return
      }
      setAdminStudios(prev => prev.map(s => s.id === id ? { ...s, auth_email: trimmed } : s))
    } finally { setSavingStudioEmail(false) }
  }

  const loadStatsArtists = async (p: string, force = false) => {
    if (!force && (statsArtists.length > 0 || loadingStats)) return
    setLoadingStats(true)
    const [r, sr, er, vr] = await Promise.all([
      fetch('/api/admin/artists?limit=10000&offset=0', { headers: H(p) }),
      fetch('/api/admin/search-stats', { headers: H(p) }),
      fetch('/api/admin/app-events', { headers: H(p) }),
      fetch('/api/admin/stats/visits', { headers: H(p) }),
    ])
    const [d, sd, ed, vd] = await Promise.all([r.json(), sr.json(), er.json(), vr.json()])
    setStatsArtists(d.artists || [])
    setSearchStats({ countries: sd.countries || [], cities: sd.cities || [], styles: sd.styles || [] })
    setAppEventCounts(ed.counts || {})
    if (vd.days) setVisits(vd.days)
    setLoadingStats(false)
  }

  const loadMoreArtists = async () => {
    setLoadingMoreArtists(true)
    try {
      const r = await fetch(`/api/admin/artists?limit=${ARTISTS_PAGE}&offset=${artistsOffset}`, { headers: H(pass) })
      const d = await r.json()
      setArtists(prev => [...prev, ...(d.artists || []).filter((a: Artist) => a.status !== 'pending')])
      setArtistsTotal(d.total ?? 0)
      setArtistsOffset(prev => prev + (d.artists?.length ?? 0))
    } finally {
      setLoadingMoreArtists(false)
    }
  }

  const saveFlashLimit = async () => {
    const val = parseInt(flashLimitInput, 10)
    if (isNaN(val) || val < 1 || val > 100) return
    setSavingFlashLimit(true)
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { ...H(pass), 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'flash_limit', value: val }),
    })
    setFlashLimit(val)
    setSavingFlashLimit(false)
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

  const toggleMaintenance = async (val: boolean) => {
    setSavingMaintenance(true)
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { ...H(pass), 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'maintenance_mode', value: val }),
    })
    setMaintenanceMode(val)
    setSavingMaintenance(false)
  }

  const toggleContactInfo = async (val: boolean) => {
    setSavingContactInfo(true)
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { ...H(pass), 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'show_contact_info', value: val }),
    })
    setShowContactInfo(val)
    setSavingContactInfo(false)
  }

  const toggleClickCounters = async (val: boolean) => {
    setSavingClickCounters(true)
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { ...H(pass), 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'show_click_counters', value: val }),
    })
    setShowClickCounters(val)
    setSavingClickCounters(false)
  }


  const toggleShowInsumos = async (val: boolean) => {
    setSavingShowInsumos(true)
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { ...H(pass), 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'show_insumos', value: val }),
    })
    setShowInsumos(val)
    setSavingShowInsumos(false)
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

  const saveIG = async (id: string) => {
    const ig = editIGValue.trim().replace(/^@/, '').toLowerCase()
    if (!ig) return
    setSavingIG(true)
    const r = await fetch(`/api/admin/artists/${id}`, {
      method: 'PATCH',
      headers: { ...H(pass), 'Content-Type': 'application/json' },
      body: JSON.stringify({ instagram: ig }),
    })
    if (r.ok) {
      patchArtistInLists(id, { instagram: ig })
      setEditingIG(null)
    }
    setSavingIG(false)
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

  const updateArtistEmail = async (id: string, email: string) => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return
    const r = await fetch(`/api/admin/artists/${id}/fix-email`, {
      method: 'POST',
      headers: { ...H(pass), 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: trimmed }),
    })
    if (!r.ok) {
      const d = await r.json().catch(() => ({}))
      alert(`Error al corregir mail: ${d.error || r.status}`)
      return
    }
    patchArtistInLists(id, { auth_email: trimmed })
  }

  const toggleVisible = async (id: string, visible: boolean) => {
    await fetch(`/api/admin/artists/${id}`, {
      method: 'PATCH',
      headers: { ...H(pass), 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible }),
    })
    patchArtistInLists(id, { visible })
  }

  const toggleInvites = async (id: string, invites_disabled: boolean) => {
    await fetch(`/api/admin/artists/${id}`, {
      method: 'PATCH',
      headers: { ...H(pass), 'Content-Type': 'application/json' },
      body: JSON.stringify({ invites_disabled }),
    })
    patchArtistInLists(id, { invites_disabled })
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
        <input type="password" placeholder="contraseña" value={pin}
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
              { key: 'stats',        label: 'Estadísticas' },
              { key: 'artistas',     label: `Tatuadores (${artists.filter(a => a.status !== 'pending').length})` },
              { key: 'pendientes',   label: pendingCount > 0 ? `Pendientes (${pendingCount})` : 'Pendientes', alert: pendingCount > 0 },
              { key: 'sponsors2',    label: `Sponsors (${sponsorsV2.length})` },
              { key: 'insumosvideo', label: 'Video Insumos' },
              { key: 'convenciones', label: `Convenciones (${conventions.length})` },
              { key: 'estudios',     label: `Estudios (${adminStudios.length})` },
              { key: 'frases',        label: 'Cultura' },
              { key: 'culturavideos', label: 'Cultura Videos' },
              { key: 'comunidad',    label: 'Comunidad' },
              { key: 'ads',          label: `Publicidad (${ads.length})` },
              { key: 'contenido',    label: 'Contenido' },
              { key: 'agregar',      label: '+ Agregar' },
              { key: 'idiomas',      label: 'Idiomas' },
              { key: 'config',       label: 'Config' },
            ] as const
            const current = tabs.find(t => t.key === tab)
            return (
              <div ref={menuRef} className="relative" style={{ minWidth: 0, flex: 1, maxWidth: 280 }}>
                <button onClick={() => setMenuOpen(v => !v)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, overflow: 'hidden' }}>
                    <span className="truncate" style={{ color: ('alert' in (current ?? {}) && (current as {alert?:boolean}).alert) ? '#f87171' : '#fff' }}>
                      {current?.label}
                    </span>
                    {('alert' in (current ?? {}) && (current as {alert?:boolean}).alert) && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f87171', flexShrink: 0 }} />}
                  </span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{menuOpen ? '▲' : '▼'}</span>
                </button>
                {menuOpen && (
                  <div className="absolute left-0 right-0 mt-1 rounded-xl overflow-hidden z-50"
                    style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 16px 40px rgba(0,0,0,0.8)' }}>
                    {tabs.map(t => (
                      <button key={t.key}
                        onClick={() => {
                          setTab(t.key); setMenuOpen(false)
                          if (t.key === 'stats') loadStatsArtists(pass)
                          if (t.key === 'frases' && culturaEditors.length === 0) {
                            setLoadingEditors(true)
                            fetch('/api/admin/cultura-editors', { headers: H(pass) }).then(r => r.json()).then(d => { if (d.editors) setCulturaEditors(d.editors) }).finally(() => setLoadingEditors(false))
                          }
                        }}
                        className="w-full text-left px-4 py-3 text-sm transition-colors"
                        style={{
                          background: tab === t.key ? 'rgba(239,255,66,0.08)' : 'transparent',
                          color: tab === t.key ? '#efff42' : ('alert' in t && t.alert) ? '#f87171' : 'rgba(255,255,255,0.6)',
                          fontWeight: tab === t.key ? 700 : 400,
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                        }}
                        onMouseEnter={e => { if (tab !== t.key) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                        onMouseLeave={e => { if (tab !== t.key) e.currentTarget.style.background = 'transparent' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {t.label}
                          {'alert' in t && t.alert && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f87171', flexShrink: 0 }} />}
                        </span>
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

          // ── ARTISTAS ──────────────────────────────────────────────────────
          <div className="flex flex-col gap-3">

            <div className="flex items-center justify-between gap-2">
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>Tatuadores ({artistsTotal})</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    const next = !showMigrated
                    setShowMigrated(next)
                    if (next) setShowHidden(false)
                    if (next && migratedArtists.length === 0) {
                      setLoadingMigrated(true)
                      const r = await fetch(`/api/admin/artists?migrated=true&limit=1000&offset=0`, { headers: H(pass) }).then(res => res.json()).catch(() => null)
                      if (r?.artists) setMigratedArtists(r.artists)
                      setLoadingMigrated(false)
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  style={{ background: showMigrated ? 'rgba(239,255,66,0.12)' : 'rgba(255,255,255,0.05)', color: showMigrated ? '#efff42' : 'rgba(255,255,255,0.5)', border: `1px solid ${showMigrated ? 'rgba(239,255,66,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
                  {loadingMigrated ? '...' : `Migrados${showMigrated && migratedArtists.length ? ` (${migratedArtists.length})` : ''}`}
                </button>
                <button
                  onClick={async () => {
                    const next = !showHidden
                    setShowHidden(next)
                    if (next) setShowMigrated(false)
                    if (next) {
                      setLoadingHidden(true)
                      const r = await fetch(`/api/admin/artists?hidden=true&limit=1000&offset=0`, { headers: H(pass) }).then(res => res.json()).catch(() => null)
                      if (r?.artists) setHiddenArtists(r.artists)
                      setLoadingHidden(false)
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  style={{ background: showHidden ? 'rgba(255,200,0,0.12)' : 'rgba(255,255,255,0.05)', color: showHidden ? 'rgba(255,200,0,0.85)' : 'rgba(255,255,255,0.5)', border: `1px solid ${showHidden ? 'rgba(255,200,0,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
                  {loadingHidden ? '...' : `Ocultos${showHidden && hiddenArtists.length ? ` (${hiddenArtists.length})` : ''}`}
                </button>
                <button
                  onClick={refreshArtists}
                  disabled={loadingArtists}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)', color: loadingArtists ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ display: 'inline-block', animation: loadingArtists ? 'spin 1s linear infinite' : 'none' }}>↻</span>
                  {loadingArtists ? 'Actualizando…' : 'Actualizar'}
                </button>
              </div>
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
                <ArtistGrid artists={searchResults} deleting={deleting} onDelete={deleteArtist} onToggleVisible={toggleVisible} onUpdateKey={updateArtistKey} onUpdateEmail={updateArtistEmail} onToggleInvites={toggleInvites} />
              </>
            ) : showMigrated ? (
              <>
                {loadingMigrated
                  ? <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Cargando migrados...</p>
                  : <ArtistGrid artists={[...migratedArtists].sort((a, b) => new Date(b.migrated_at!).getTime() - new Date(a.migrated_at!).getTime())} deleting={deleting} onDelete={deleteArtist} onToggleVisible={toggleVisible} onUpdateKey={updateArtistKey} onUpdateEmail={updateArtistEmail} onToggleInvites={toggleInvites} />
                }
              </>
            ) : showHidden ? (
              <>
                {loadingHidden
                  ? <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Cargando ocultos...</p>
                  : hiddenArtists.length === 0
                    ? <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Sin tatuadores ocultos.</p>
                    : <ArtistGrid artists={[...hiddenArtists].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())} deleting={deleting} onDelete={deleteArtist} onToggleVisible={toggleVisible} onUpdateKey={updateArtistKey} onUpdateEmail={updateArtistEmail} onToggleInvites={toggleInvites} />
                }
              </>
            ) : (
              <>
                <ArtistGrid artists={[...artists.filter(a => a.status !== 'pending')].sort((a, b) => {
                  const aM = a.migrated_at ? new Date(a.migrated_at).getTime() : 0
                  const bM = b.migrated_at ? new Date(b.migrated_at).getTime() : 0
                  const MONTH = 30 * 24 * 60 * 60 * 1000
                  const aRecent = aM > Date.now() - MONTH
                  const bRecent = bM > Date.now() - MONTH
                  if (aRecent && !bRecent) return -1
                  if (!aRecent && bRecent) return 1
                  if (aRecent && bRecent) return bM - aM
                  return 0
                })} deleting={deleting} onDelete={deleteArtist} onToggleVisible={toggleVisible} onUpdateKey={updateArtistKey} onUpdateEmail={updateArtistEmail} onToggleInvites={toggleInvites} />
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
              : <StatsPanel artists={statsArtists} visits={visits} installs={installs} studios={adminStudios} searchStats={searchStats} appEventCounts={appEventCounts} pass={pass} onResetSearch={() => setSearchStats({ countries: [], cities: [], styles: [] })} onResetAppEvent={async (key) => { await fetch('/api/admin/app-events', { method: 'DELETE', headers: { ...H(pass), 'Content-Type': 'application/json' }, body: JSON.stringify({ event_name: key }) }); setAppEventCounts(prev => ({ ...prev, [key]: 0 })) }} onResetArtistClicks={async (field) => { await fetch('/api/admin/stats/reset-clicks', { method: 'DELETE', headers: { ...H(pass), 'Content-Type': 'application/json' }, body: JSON.stringify({ field }) }); loadStatsArtists(pass, true) }} />
            }
          </div>

        ) : tab === 'pendientes' ? (

          // ── PENDIENTES ───────────────────────────────────────────────────────
          (() => {
            const pending = artists.filter(a => a.status === 'pending')
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
                {pending.length === 0 ? (
                  <p className="text-sm py-8 text-center" style={{ color: 'rgba(255,255,255,0.15)' }}>
                    No hay perfiles pendientes
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {pending.map(a => {
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
                                {a.auth_email && (
                                  <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,255,66,0.1)', color: '#efff42', border: '1px solid rgba(239,255,66,0.25)' }}>
                                    ✉ {a.auth_email}
                                  </span>
                                )}
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
                            {editingIG === a.id ? (
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-xs" style={{ color: '#c77dff' }}>@</span>
                                <input
                                  value={editIGValue}
                                  onChange={e => setEditIGValue(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') saveIG(a.id); if (e.key === 'Escape') setEditingIG(null) }}
                                  className="text-xs rounded px-1.5 py-0.5 flex-1 min-w-0"
                                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(199,125,255,0.4)', color: '#c77dff', outline: 'none' }}
                                  autoFocus
                                />
                                <button onClick={() => saveIG(a.id)} disabled={savingIG}
                                  className="text-xs px-2 py-0.5 rounded font-bold shrink-0"
                                  style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.35)', color: '#4ade80' }}>
                                  {savingIG ? '...' : 'ok'}
                                </button>
                                <button onClick={() => setEditingIG(null)}
                                  className="text-xs px-1.5 py-0.5 rounded shrink-0"
                                  style={{ color: 'rgba(255,255,255,0.3)' }}>✕</button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <p className="text-xs truncate font-semibold" style={{ color: '#c77dff' }}>
                                  {a.instagram}
                                  {a.pending_reason?.startsWith('ig_change') && (
                                    <span className="font-normal ml-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                      (antes: @{a.pending_reason.split(':')[1]})
                                    </span>
                                  )}
                                </p>
                                <button onClick={() => { setEditingIG(a.id); setEditIGValue(a.instagram || '') }}
                                  className="shrink-0 text-xs"
                                  style={{ color: 'rgba(199,125,255,0.4)', lineHeight: 1 }}
                                  title="Editar Instagram">✎</button>
                              </div>
                            )}
                            {a.whatsapp && <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.2)' }}>{a.whatsapp}</p>}
                          </div>
                          <div className="flex flex-col gap-2 shrink-0">
                            <button onClick={() => setPreviewArtist(a)}
                              className="text-xs px-4 py-2 rounded-lg font-bold transition-colors"
                              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}>
                              Ver perfil
                            </button>
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

            {/* Límite de flash designs */}
            <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-sm font-bold text-white mb-1">Límite de flash tattoos por artista</p>
              <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                Máximo de diseños que cada artista puede subir a su Flashbook. Actualmente: <span style={{ color: '#efff42', fontWeight: 700 }}>{flashLimit}</span>
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number" min={1} max={100}
                  value={flashLimitInput}
                  onChange={e => setFlashLimitInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveFlashLimit()}
                  className="rounded-lg px-3 py-2 text-sm font-bold text-white"
                  style={{ width: 80, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', outline: 'none' }}
                />
                <button
                  onClick={saveFlashLimit}
                  disabled={savingFlashLimit || parseInt(flashLimitInput, 10) === flashLimit}
                  className="px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-40"
                  style={{ background: '#efff42', color: '#000' }}>
                  {savingFlashLimit ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </div>

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

            {/* Modo mantenimiento */}
            <div className="rounded-xl p-5" style={{ background: maintenanceMode ? 'rgba(255,80,80,0.05)' : 'rgba(255,255,255,0.03)', border: `1px solid ${maintenanceMode ? 'rgba(255,80,80,0.3)' : 'rgba(255,255,255,0.07)'}` }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Modo mantenimiento</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                    Muestra una pantalla de "no disponible" en lugar del sitio. El admin sigue funcionando normalmente.
                  </p>
                </div>
                <button
                  onClick={() => toggleMaintenance(!maintenanceMode)}
                  disabled={savingMaintenance}
                  className="ml-4 shrink-0 rounded-full transition-all disabled:opacity-50"
                  style={{ width: 48, height: 28, background: maintenanceMode ? 'rgba(255,80,80,0.7)' : 'rgba(255,255,255,0.1)', position: 'relative' }}>
                  <span style={{
                    position: 'absolute', top: 4,
                    left: maintenanceMode ? 24 : 4,
                    width: 20, height: 20,
                    borderRadius: '50%',
                    background: maintenanceMode ? '#fff' : 'rgba(255,255,255,0.4)',
                    transition: 'left 0.2s',
                  }} />
                </button>
              </div>
              <p className="text-xs mt-3 font-bold" style={{ color: maintenanceMode ? 'rgba(255,100,100,0.8)' : 'rgba(255,255,255,0.2)' }}>
                {maintenanceMode ? '⚠ Sitio inaccesible para usuarios' : 'Desactivado — sitio funcionando normalmente'}
              </p>
            </div>

            {/* Mostrar insumos */}
            <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Mostrar sección Insumos</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                    Muestra el botón "Insumos" junto al de "Eventos" en la página principal. Si está desactivado, solo se ve Eventos.
                  </p>
                </div>
                <button
                  onClick={() => toggleShowInsumos(!showInsumos)}
                  disabled={savingShowInsumos}
                  className="ml-4 shrink-0 rounded-full transition-all disabled:opacity-50"
                  style={{ width: 48, height: 28, background: showInsumos ? '#efff42' : 'rgba(255,255,255,0.1)', position: 'relative' }}>
                  <span style={{
                    position: 'absolute', top: 4,
                    left: showInsumos ? 24 : 4,
                    width: 20, height: 20,
                    borderRadius: '50%',
                    background: showInsumos ? '#000' : 'rgba(255,255,255,0.4)',
                    transition: 'left 0.2s',
                  }} />
                </button>
              </div>
              <p className="text-xs mt-3 font-bold" style={{ color: showInsumos ? '#efff42' : 'rgba(255,255,255,0.2)' }}>
                {showInsumos ? 'Activado — se ven Insumos y Eventos' : 'Desactivado — solo se ve Eventos'}
              </p>
            </div>

            {/* Mostrar WhatsApp y mail */}
            <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Mostrar WhatsApp y mail en perfiles</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                    Si está desactivado, los perfiles solo muestran Instagram. El contacto queda en manos del tatuador.
                  </p>
                </div>
                <button
                  onClick={() => toggleContactInfo(!showContactInfo)}
                  disabled={savingContactInfo}
                  className="ml-4 shrink-0 rounded-full transition-all disabled:opacity-50"
                  style={{ width: 48, height: 28, background: showContactInfo ? '#efff42' : 'rgba(255,255,255,0.1)', position: 'relative' }}>
                  <span style={{
                    position: 'absolute', top: 4,
                    left: showContactInfo ? 24 : 4,
                    width: 20, height: 20,
                    borderRadius: '50%',
                    background: showContactInfo ? '#000' : 'rgba(255,255,255,0.4)',
                    transition: 'left 0.2s',
                  }} />
                </button>
              </div>
              <p className="text-xs mt-3 font-bold" style={{ color: showContactInfo ? '#efff42' : 'rgba(255,255,255,0.2)' }}>
                {showContactInfo ? 'Activado — se muestran WhatsApp y mail' : 'Desactivado — solo se muestra Instagram'}
              </p>
            </div>

            {/* Contadores de clicks */}
            <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Contadores de clicks</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                    Muestra los contadores de Instagram y WhatsApp en los perfiles de tatuadores y estudios.
                  </p>
                </div>
                <button
                  onClick={() => toggleClickCounters(!showClickCounters)}
                  disabled={savingClickCounters}
                  className="ml-4 shrink-0 rounded-full transition-all disabled:opacity-50"
                  style={{ width: 48, height: 28, background: showClickCounters ? '#efff42' : 'rgba(255,255,255,0.1)', position: 'relative' }}>
                  <span style={{
                    position: 'absolute', top: 4,
                    left: showClickCounters ? 24 : 4,
                    width: 20, height: 20,
                    borderRadius: '50%',
                    background: showClickCounters ? '#000' : 'rgba(255,255,255,0.4)',
                    transition: 'left 0.2s',
                  }} />
                </button>
              </div>
              <p className="text-xs mt-3 font-bold" style={{ color: showClickCounters ? '#efff42' : 'rgba(255,255,255,0.2)' }}>
                {showClickCounters ? 'Activado — se muestran los contadores de IG y WA' : 'Desactivado — solo se muestra visitas'}
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

            {/* Link de registro para marcas */}
            <div className="rounded-xl p-5 flex flex-col gap-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-bold" style={{ color: '#efff42', letterSpacing: '0.08em' }}>REGISTRO DE MARCAS</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
                El registro es solo por invitación. Generá un link único de un solo uso para cada marca que quieras invitar.
              </p>
              <button
                onClick={async () => {
                  const r = await fetch('/api/admin/sponsor-invites', { method: 'POST', headers: H(pass) })
                  const d = await r.json()
                  if (d.url) {
                    await navigator.clipboard.writeText(d.url).catch(() => {})
                    setKeyCopied(true); setTimeout(() => setKeyCopied(false), 2000)
                  }
                }}
                className="self-start font-bold text-sm py-2 px-5 rounded-full"
                style={{ background: keyCopied ? 'rgba(74,222,128,0.15)' : '#efff42', color: keyCopied ? '#4ade80' : '#000', border: keyCopied ? '1px solid rgba(74,222,128,0.4)' : 'none', transition: 'all 0.2s' }}>
                {keyCopied ? 'Copiado ✓' : 'Generar link'}
              </button>
            </div>

            {/* Registros pendientes — marcas que se registraron solas por el link.
                Edición completa igual que la lista general (mismo renderSponsorV2Row),
                más las acciones propias de tener login: vincular y revocar acceso. */}
            <div className="rounded-xl p-5 flex flex-col gap-2"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold" style={{ color: '#efff42', letterSpacing: '0.08em' }}>REGISTROS PENDIENTES</p>
                <button onClick={refreshSponsorsV2} disabled={refreshingSponsorsV2}
                  className="text-xs font-bold px-2.5 py-1 rounded-lg disabled:opacity-50"
                  style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)' }}>
                  {refreshingSponsorsV2 ? '...' : 'Actualizar'}
                </button>
              </div>
              {!sponsorsV2.some(sp => sp.auth_email) ? (
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Sin registros nuevos por ahora.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {sponsorsV2.filter(sp => sp.auth_email).map(sp => (
                    <div key={sp.id} className="flex flex-col gap-2 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <button
                        onClick={() => setExpandedPendingId(prev => prev === sp.id ? null : sp.id)}
                        className="flex items-center justify-between gap-3 w-full text-left"
                        style={{ background: 'none', border: 'none', padding: '6px 0', cursor: 'pointer' }}>
                        <span className="text-sm font-bold text-white truncate">{sp.name}</span>
                        <span className="text-xs shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          {expandedPendingId === sp.id ? '▲ cerrar' : '▼ expandir'}
                        </span>
                      </button>
                      {expandedPendingId === sp.id && (
                      <>
                      {renderSponsorV2Row(sp)}
                      <SponsorDailyLimitEditor
                        sponsorId={sp.id}
                        value={sp.daily_post_limit}
                        pass={pass}
                        onSaved={v => setSponsorsV2(prev => prev.map(x => x.id === sp.id ? { ...x, daily_post_limit: v } : x))} />
                      <button
                        onClick={() => {
                          if (editingPendingId === sp.id) { setEditingPendingId(null); return }
                          setEditingPendingId(sp.id); setLinkTargetId(sp.linked_from || '')
                        }}
                        className="self-start text-xs font-bold px-3 py-1.5 rounded-lg"
                        style={{ background: 'rgba(239,255,66,0.1)', color: '#efff42', border: '1px solid rgba(239,255,66,0.25)' }}>
                        {editingPendingId === sp.id ? 'Cancelar vínculo' : 'Vincular con otra marca'}
                      </button>
                      {editingPendingId === sp.id && (
                        <div className="flex flex-col gap-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                            Vincular con una marca ya cargada — le pasa el login a esa marca, vos seguís editándola como siempre.
                          </p>
                          <div className="flex items-center gap-2">
                            <select
                              value={linkTargetId}
                              onChange={e => setLinkTargetId(e.target.value)}
                              className="flex-1 px-3 py-2 rounded-lg text-sm"
                              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', outline: 'none' }}>
                              <option value="">Elegir marca...</option>
                              {sponsorsV2.filter(s => !s.auth_email).map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                            {(() => {
                              const preview = sponsorsV2.find(s => s.id === linkTargetId)
                              if (!preview) return null
                              return (
                                <div className="shrink-0 rounded-lg flex items-center justify-center overflow-hidden"
                                  style={{ width: 44, height: 32, background: '#000', border: '1px solid rgba(239,255,66,0.3)' }}>
                                  {preview.logo_url ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={preview.logo_url} alt="" style={{ maxHeight: 24, maxWidth: 40, objectFit: 'contain' }} />
                                  ) : (
                                    <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)' }}>Sin logo</span>
                                  )}
                                </div>
                              )
                            })()}
                            <button
                              disabled={linkingPending || !linkTargetId}
                              onClick={async () => {
                                const source = sponsorsV2.find(s => s.id === linkTargetId)
                                if (!source) return
                                setLinkingPending(true)
                                try {
                                  // Primero se borra el registro nuevo (sin contenido propio) — si no,
                                  // el mismo user_id/auth_email quedaría un instante en dos filas y la
                                  // restricción de unicidad rechaza el PATCH siguiente sin avisar nada.
                                  const delRes = await fetch(`/api/admin/sponsors-v2/${sp.id}`, { method: 'DELETE', headers: H(pass) })
                                  if (!delRes.ok) {
                                    const dd = await delRes.json().catch(() => ({}))
                                    alert(`Error al borrar el registro: ${dd.error || delRes.status}`)
                                    return
                                  }
                                  // La marca original sigue siendo la que editás siempre — solo le
                                  // pasamos el login (user_id/auth_email) del registro nuevo.
                                  const r = await fetch(`/api/admin/sponsors-v2/${source.id}`, {
                                    method: 'PATCH',
                                    headers: { ...H(pass), 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ user_id: sp.user_id, auth_email: sp.auth_email, active: true }),
                                  })
                                  const d = await r.json()
                                  if (!r.ok) {
                                    alert(`Error al vincular: ${d.error || r.status}`)
                                    setSponsorsV2(prev => prev.filter(x => x.id !== sp.id))
                                    return
                                  }
                                  setSponsorsV2(prev => prev.filter(x => x.id !== sp.id).map(x => x.id === source.id ? d.sponsor : x))
                                  setEditingPendingId(null); setLinkTargetId('')
                                } finally { setLinkingPending(false) }
                              }}
                              className="shrink-0 text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50"
                              style={{ background: '#efff42', color: '#000' }}>
                              {linkingPending ? 'Vinculando...' : 'Vincular'}
                            </button>
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => revokeSponsorAccess(sp.id)}
                        disabled={revokingAccessId === sp.id}
                        className="self-start text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50"
                        style={{ background: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}
                        title="Borra solo el mail/contraseña — el perfil de la marca queda intacto">
                        {revokingAccessId === sp.id ? 'Borrando acceso...' : 'Revocar acceso'}
                      </button>
                      </>
                      )}
                    </div>
                  ))}
                </div>
              )}
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

            {/* Separación entre logos del banner */}
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Separación entre logos en banner</p>
                <span className="text-xs font-bold" style={{ color: '#efff42' }}>{bannerGap}px</span>
              </div>
              <input type="range" min={0} max={60} step={2} value={bannerGap}
                onChange={e => setBannerGap(parseInt(e.target.value, 10))}
                onMouseUp={async e => {
                  const val = parseInt((e.target as HTMLInputElement).value, 10)
                  setSavingBannerGap(true)
                  await fetch('/api/admin/settings', {
                    method: 'PATCH',
                    headers: { ...H(pass), 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: 'sponsors_v2_banner_gap', value: val }),
                  })
                  setSavingBannerGap(false)
                }}
                onTouchEnd={async e => {
                  const val = parseInt((e.target as HTMLInputElement).value, 10)
                  setSavingBannerGap(true)
                  await fetch('/api/admin/settings', {
                    method: 'PATCH',
                    headers: { ...H(pass), 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: 'sponsors_v2_banner_gap', value: val }),
                  })
                  setSavingBannerGap(false)
                }}
                className="w-full" />
              {savingBannerGap && <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Guardando...</p>}
            </div>

            {/* Imágenes de fondo — Insumos */}
            <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold" style={{ color: '#efff42', letterSpacing: '0.08em' }}>FONDOS GRILLA INSUMOS</p>
                <label className="cursor-pointer">
                  <span className="text-xs px-3 py-1.5 rounded-lg font-bold"
                    style={{ background: uploadingBg ? 'rgba(255,255,255,0.05)' : 'rgba(239,255,66,0.12)', color: uploadingBg ? 'rgba(255,255,255,0.3)' : '#efff42', border: '1px solid rgba(239,255,66,0.2)' }}>
                    {uploadingBg ? 'Subiendo...' : '+ Agregar imagen'}
                  </span>
                  <input type="file" accept="image/*" className="hidden" disabled={uploadingBg}
                    onChange={async e => {
                      const file = e.target.files?.[0]; if (!file) return
                      setUploadingBg(true)
                      try {
                        const fd = new FormData(); fd.append('image', file)
                        const r = await fetch('/api/admin/insumos-bg', { method: 'POST', headers: H(pass), body: fd })
                        const d = await r.json()
                        if (d.urls) setInsumoBgImages(d.urls)
                      } finally { setUploadingBg(false); e.target.value = '' }
                    }} />
                </label>
              </div>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                Se elige una al azar cada vez que alguien abre la sección Insumos. Idealmente fotos de personas tatuadas.
              </p>
              {insumoBgImages.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: 'rgba(255,255,255,0.15)' }}>Sin imágenes cargadas</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {insumoBgImages.map(url => (
                    <div key={url} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', aspectRatio: '3/4' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      <button
                        onClick={async () => {
                          if (!confirm('¿Borrar esta imagen?')) return
                          const r = await fetch('/api/admin/insumos-bg', { method: 'DELETE', headers: { ...H(pass), 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) })
                          const d = await r.json()
                          if (d.urls) setInsumoBgImages(d.urls)
                        }}
                        style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
                  if (sponsorV2ProfileLogo) fd.append('detail_logo', sponsorV2ProfileLogo)
                  fd.append('name', sponsorV2Form.name.trim())
                  fd.append('description', sponsorV2Form.category.trim())
                  fd.append('bio', sponsorV2Form.bio.trim())
                  fd.append('instagram', sponsorV2Form.instagram.trim())
                  fd.append('whatsapp', sponsorV2Form.whatsapp.trim())
                  fd.append('link', sponsorV2Form.link.trim())
                  fd.append('level', sponsorV2Form.country.trim() ? 'country' : 'global')
                  fd.append('city', '')
                  fd.append('country', sponsorV2Form.country.trim())
                  fd.append('keep_color', 'true')
                  fd.append('detail_logo_mode', 'color')
                  if (sponsorV2Form.expires_at) fd.append('expires_at', new Date(sponsorV2Form.expires_at).toISOString())
                  fd.append('notes', sponsorV2Form.notes.trim())
                  fd.append('logo_scale', String(sponsorV2Form.logo_scale))
                  fd.append('grid_logo_scale', String(sponsorV2Form.grid_logo_scale))
                  const r = await fetch('/api/admin/sponsors-v2', { method: 'POST', headers: H(pass), body: fd })
                  const d = await r.json()
                  if (!r.ok) throw new Error(d.error || 'Error')
                  setSponsorsV2(prev => [d.sponsor, ...prev])
                  setSponsorV2Form({ name: '', category: '', bio: '', instagram: '', whatsapp: '', link: '', level: 'global', city: '', country: '', expires_at: '', notes: '', logo_scale: 100, grid_logo_scale: 100 })
                  setSponsorV2Logo(null); setSponsorV2LogoPreview(null)
                  setSponsorV2ProfileLogo(null); setSponsorV2ProfileLogoPreview(null)
                } catch (err: unknown) {
                  setSponsorV2Error(err instanceof Error ? err.message : 'Error')
                } finally { setSavingSponsorsV2(false) }
              }}
              className="rounded-xl p-5 flex flex-col gap-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-bold" style={{ color: '#efff42', letterSpacing: '0.08em' }}>NUEVA MARCA</p>

              {/* Logo */}
              <label className="cursor-pointer block">
                <p className="text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Logo *</p>
                <div className="flex items-center gap-3">
                  {sponsorV2LogoPreview ? (
                    <div className="rounded-lg overflow-hidden flex items-center justify-center"
                      style={{ width: 100, height: 40, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sponsorV2LogoPreview} alt="" style={{ maxHeight: 32, maxWidth: 90, objectFit: 'contain' }} />
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

              {/* Logo de perfil (grilla) */}
              <label className="cursor-pointer block">
                <p className="text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Logo de perfil <span style={{ color: 'rgba(255,255,255,0.2)' }}>(opcional · reemplaza al logo en la grilla)</span></p>
                <div className="flex items-center gap-3">
                  {sponsorV2ProfileLogoPreview ? (
                    <div className="rounded-lg overflow-hidden flex items-center justify-center"
                      style={{ width: 100, height: 40, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sponsorV2ProfileLogoPreview} alt="" style={{ maxHeight: 32, maxWidth: 90, objectFit: 'contain' }} />
                    </div>
                  ) : (
                    <div className="rounded-lg flex items-center justify-center text-xs"
                      style={{ width: 100, height: 40, border: '2px dashed rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.2)' }}>
                      sin logo
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]; if (!file) return
                      setSponsorV2ProfileLogo(file)
                      setSponsorV2ProfileLogoPreview(URL.createObjectURL(file))
                    }} />
                </div>
              </label>

              {/* Tamaño del logo */}
              <div className="flex flex-col gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Tamaño en banner</p>
                    <span className="text-xs font-bold" style={{ color: '#efff42' }}>{sponsorV2Form.logo_scale}%</span>
                  </div>
                  <input type="range" min={50} max={150} step={5} value={sponsorV2Form.logo_scale}
                    onChange={e => setSponsorV2Form(f => ({ ...f, logo_scale: parseInt(e.target.value, 10) }))}
                    className="w-full" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Tamaño en grilla</p>
                    <span className="text-xs font-bold" style={{ color: '#efff42' }}>{sponsorV2Form.grid_logo_scale}px</span>
                  </div>
                  <input type="range" min={30} max={150} step={5} value={sponsorV2Form.grid_logo_scale}
                    onChange={e => setSponsorV2Form(f => ({ ...f, grid_logo_scale: parseInt(e.target.value, 10) }))}
                    className="w-full" />
                </div>
              </div>

              {/* Países */}
              <div>
                <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Países (separar con coma, vacío = todos)</p>
                <input value={sponsorV2Form.country} onChange={e => setSponsorV2Form(f => ({ ...f, country: e.target.value }))}
                  placeholder="Argentina, Chile, Uruguay..." className={iCls} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AdField label="Nombre *">
                  <input required value={sponsorV2Form.name} onChange={e => setSponsorV2Form(f => ({ ...f, name: e.target.value }))}
                    placeholder="Nombre de la marca" className={iCls} />
                </AdField>
                <AdField label="Categoría">
                  <input value={sponsorV2Form.category} onChange={e => setSponsorV2Form(f => ({ ...f, category: e.target.value }))}
                    placeholder="tinta, cremas, agujas..." className={iCls} />
                </AdField>
                <AdField label="Link">
                  <input value={sponsorV2Form.link} onChange={e => setSponsorV2Form(f => ({ ...f, link: e.target.value }))}
                    placeholder="https://..." className={iCls} />
                </AdField>
                <AdField label="Vencimiento (opcional)">
                  <input type="date" value={sponsorV2Form.expires_at} onChange={e => setSponsorV2Form(f => ({ ...f, expires_at: e.target.value }))}
                    className={iCls} style={{ colorScheme: 'dark' }} />
                </AdField>
              </div>

              {/* Bio e Instagram */}
              <div>
                <p className="text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bio / Historia de la marca</p>
                <textarea value={sponsorV2Form.bio} rows={3}
                  onChange={e => setSponsorV2Form(f => ({ ...f, bio: e.target.value }))}
                  placeholder="Contá la historia de la marca, dónde opera, qué hace..."
                  className={iCls} style={{ resize: 'none', lineHeight: 1.6 }} />
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Instagram (sin @)</p>
                <input value={sponsorV2Form.instagram} onChange={e => setSponsorV2Form(f => ({ ...f, instagram: e.target.value }))}
                  placeholder="nombredemarca" className={iCls} />
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>WhatsApp</p>
                <input value={sponsorV2Form.whatsapp} onChange={e => setSponsorV2Form(f => ({ ...f, whatsapp: e.target.value }))}
                  placeholder="+54 9 11 1234 5678" className={iCls} />
              </div>

              {/* Notas internas */}
              <div>
                <p className="text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notas internas</p>
                <textarea value={sponsorV2Form.notes} rows={2}
                  onChange={e => setSponsorV2Form(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Precio acordado, contacto, condiciones..."
                  className={iCls} style={{ resize: 'none', lineHeight: 1.6 }} />
              </div>

              {sponsorV2Error && <p className="text-xs text-red-400">{sponsorV2Error}</p>}
              <button type="submit" disabled={savingSponsorsV2}
                className="self-end px-6 py-2 rounded-lg font-bold text-sm disabled:opacity-50"
                style={{ background: '#efff42', color: '#000' }}>
                {savingSponsorsV2 ? 'Guardando...' : 'Agregar marca'}
              </button>
            </form>

            {/* Lista sponsors v2 — las que ya tienen login se editan desde
                "Registros pendientes" más arriba, no acá, para no duplicarlas */}
            <div className="flex flex-col gap-3">
              {sponsorsV2.filter(sp => !sp.auth_email).length === 0 && (
                <p className="text-sm text-center py-8" style={{ color: 'rgba(255,255,255,0.1)' }}>Sin marcas</p>
              )}
              {sponsorsV2.filter(sp => !sp.auth_email).map(renderSponsorV2Row)}
            </div>

          </div>

        ) : tab === 'agregar' ? (

          // ── AGREGAR ──────────────────────────────────────────────────────────
          <div className="flex flex-col gap-10">
            <AddArtistForm pass={pass} onAdded={a => { setArtists(prev => [a, ...prev]); setArtistsTotal(prev => prev + 1) }} availableStyles={adminStyles} existingArtists={artists} />
            <DraftArtistsList pass={pass} />
          </div>

        ) : tab === 'convenciones' ? (

          // ── CONVENCIONES ─────────────────────────────────────────────────────
          <div className="flex flex-col gap-8">

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

            {/* Agregar estudio como borrador — genera un link de /reclamar-estudio/[id] */}
            <div className="rounded-xl p-5 flex flex-col gap-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold" style={{ color: '#efff42', letterSpacing: '0.08em' }}>AGREGAR ESTUDIO</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Se crea como borrador (no publicado) — le mandás el link y lo activa poniendo mail y contraseña.
                  </p>
                </div>
                <button
                  onClick={() => { if (studioFormOpen) resetStudioForm(); else setStudioFormOpen(true) }}
                  className="shrink-0 font-bold text-xs py-2 px-4 rounded-full"
                  style={{ background: studioFormOpen ? 'rgba(239,255,66,0.1)' : '#efff42', border: studioFormOpen ? '1px solid rgba(239,255,66,0.3)' : 'none', color: studioFormOpen ? '#efff42' : '#000' }}>
                  {studioFormOpen ? 'Cancelar' : '+ Agregar estudio'}
                </button>
              </div>

              {studioFormOpen && (studioCreated ? (
                <div className="rounded-xl p-4" style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)' }}>
                  <p className="text-sm font-bold mb-1" style={{ color: '#4ade80' }}>Estudio agregado (borrador)</p>
                  <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {studioCreated.name} está guardado pero todavía no es visible. Mandale este link — ahí ve su perfil como vista previa y lo activa poniendo mail y contraseña.
                  </p>
                  <p className="text-xs mb-2 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Link para activar el perfil</p>
                  <div className="flex gap-2">
                    <span className="flex-1 py-2 px-3 rounded-lg text-xs truncate"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
                      {`${process.env.NEXT_PUBLIC_SITE_URL || 'https://flashttoo.com'}/reclamar-estudio/${studioCreated.claim_code}`}
                    </span>
                    <button onClick={() => {
                      navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://flashttoo.com'}/reclamar-estudio/${studioCreated.claim_code}`)
                      setCopiedStudioLink(studioCreated.id); setTimeout(() => setCopiedStudioLink(null), 2000)
                    }}
                      className="px-4 rounded-lg text-xs font-bold shrink-0"
                      style={{ background: copiedStudioLink === studioCreated.id ? 'rgba(74,222,128,0.15)' : 'rgba(239,255,66,0.1)', border: `1px solid ${copiedStudioLink === studioCreated.id ? 'rgba(74,222,128,0.4)' : 'rgba(239,255,66,0.3)'}`, color: copiedStudioLink === studioCreated.id ? '#4ade80' : '#efff42' }}>
                      {copiedStudioLink === studioCreated.id ? '✓' : 'copiar'}
                    </button>
                  </div>
                  <button onClick={resetStudioForm} className="w-full mt-4 py-2.5 rounded-xl text-sm font-bold"
                    style={{ background: '#efff42', color: '#000' }}>
                    Agregar otro
                  </button>
                </div>
              ) : (
                <form onSubmit={saveStudio} className="flex flex-col gap-3">
                  <label className="cursor-pointer block">
                    <p className="text-xs mb-1.5 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Logo *</p>
                    {studioLogoPreview ? (
                      <div className="relative rounded-xl overflow-hidden" style={{ width: 100, aspectRatio: '1' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={studioLogoPreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
                          <span className="text-xs text-white/60 bg-black/50 px-2 py-1 rounded-full">cambiar</span>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl flex items-center justify-center" style={{ width: 100, aspectRatio: '1', border: '2px dashed rgba(255,255,255,0.08)' }}>
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>subir logo</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleStudioLogo} />
                  </label>
                  <input value={studioForm.name} onChange={e => setStudioForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Nombre del estudio *" className="w-full py-2 px-3 text-sm text-white outline-none rounded-lg bg-white/5 border border-white/10 focus:border-white/30 transition-colors placeholder-white/20" />
                  <div className="flex gap-2">
                    <input value={studioForm.city} onChange={e => setStudioForm(f => ({ ...f, city: e.target.value }))}
                      placeholder="Ciudad *" className="flex-1 py-2 px-3 text-sm text-white outline-none rounded-lg bg-white/5 border border-white/10 focus:border-white/30 transition-colors placeholder-white/20" />
                    <input value={studioForm.country} onChange={e => setStudioForm(f => ({ ...f, country: e.target.value }))}
                      placeholder="País *" className="flex-1 py-2 px-3 text-sm text-white outline-none rounded-lg bg-white/5 border border-white/10 focus:border-white/30 transition-colors placeholder-white/20" />
                  </div>
                  <textarea value={studioForm.description} onChange={e => setStudioForm(f => ({ ...f, description: e.target.value }))}
                    rows={3} placeholder="Descripción"
                    className="w-full py-2 px-3 text-sm text-white outline-none rounded-lg bg-white/5 border border-white/10 focus:border-white/30 transition-colors placeholder-white/20 resize-none" />
                  <div className="relative">
                    <input value={studioForm.instagram} onChange={e => setStudioForm(f => ({ ...f, instagram: e.target.value }))}
                      placeholder="Instagram" className="w-full py-2 px-3 text-sm text-white outline-none rounded-lg bg-white/5 border border-white/10 focus:border-white/30 transition-colors placeholder-white/20" />
                    {studioForm.instagram.trim() && (
                      <span className="absolute right-3 top-2.5 text-xs" style={{ color: studioIgStatus === 'taken' ? '#f87171' : studioIgStatus === 'ok' ? '#4ade80' : 'rgba(255,255,255,0.2)' }}>
                        {studioIgStatus === 'checking' ? '...' : studioIgStatus === 'taken' ? 'en uso' : studioIgStatus === 'ok' ? 'libre' : ''}
                      </span>
                    )}
                  </div>
                  <input value={studioForm.whatsapp} onChange={e => setStudioForm(f => ({ ...f, whatsapp: e.target.value }))}
                    placeholder="WhatsApp" className="w-full py-2 px-3 text-sm text-white outline-none rounded-lg bg-white/5 border border-white/10 focus:border-white/30 transition-colors placeholder-white/20" />
                  <input value={studioForm.website} onChange={e => setStudioForm(f => ({ ...f, website: e.target.value }))}
                    placeholder="Sitio web" className="w-full py-2 px-3 text-sm text-white outline-none rounded-lg bg-white/5 border border-white/10 focus:border-white/30 transition-colors placeholder-white/20" />
                  {studioError && <p className="text-xs" style={{ color: '#f87171' }}>{studioError}</p>}
                  <button type="submit" disabled={savingStudio || studioIgStatus === 'taken'} className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-40"
                    style={{ background: '#efff42', color: '#000' }}>
                    {savingStudio ? 'Guardando...' : 'Agregar estudio'}
                  </button>
                </form>
              ))}
            </div>

            {/* Lista de estudios */}
            <div className="flex items-center justify-between">
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>
                Estudios ({adminStudios.length})
              </p>
              <button
                onClick={() => refreshStudios(pass)}
                disabled={loadingStudios}
                style={{ fontSize: 12, color: loadingStudios ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: loadingStudios ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: '2px 0' }}
              >
                <span style={{ display: 'inline-block', animation: loadingStudios ? 'spin 1s linear infinite' : 'none' }}>↻</span>
                {loadingStudios ? 'Actualizando…' : 'Actualizar'}
              </button>
            </div>
            <input
              value={studioSearch}
              onChange={e => setStudioSearch(e.target.value)}
              placeholder="Buscar estudio por nombre..."
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
            <div className="flex flex-col gap-3">
              {adminStudios
                .filter(s => s.name.toLowerCase().includes(studioSearch.toLowerCase()))
                .sort((a, b) => {
                  // Inactivos primero
                  if (!a.visible && b.visible) return -1
                  if (a.visible && !b.visible) return 1
                  // Luego por proximidad de vencimiento
                  if (!a.expires_at && !b.expires_at) return 0
                  if (!a.expires_at) return 1
                  if (!b.expires_at) return -1
                  return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime()
                })
                .map(studio => (
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
                        {studio.auth_email && (
                          editingStudioEmail?.id === studio.id ? (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <input
                                value={editingStudioEmail.value}
                                onChange={e => setEditingStudioEmail({ id: studio.id, value: e.target.value })}
                                onKeyDown={async e => {
                                  if (e.key === 'Enter') {
                                    await updateStudioEmail(studio.id, editingStudioEmail.value)
                                    setEditingStudioEmail(null)
                                  }
                                  if (e.key === 'Escape') setEditingStudioEmail(null)
                                }}
                                autoFocus
                                className="py-0.5 px-2 rounded text-xs font-bold outline-none"
                                style={{ background: 'rgba(239,255,66,0.08)', border: '1px solid rgba(239,255,66,0.35)', color: '#efff42', minWidth: 160 }}
                              />
                              <button onClick={async () => { await updateStudioEmail(studio.id, editingStudioEmail.value); setEditingStudioEmail(null) }}
                                disabled={savingStudioEmail}
                                className="text-xs px-2 py-0.5 rounded font-bold shrink-0 disabled:opacity-40"
                                style={{ background: 'rgba(239,255,66,0.12)', border: '1px solid rgba(239,255,66,0.3)', color: '#efff42' }}>
                                {savingStudioEmail ? '...' : 'ok'}
                              </button>
                              <button onClick={() => setEditingStudioEmail(null)}
                                className="text-xs px-1.5 py-0.5 rounded shrink-0"
                                style={{ color: 'rgba(255,255,255,0.25)' }}>✕</button>
                            </div>
                          ) : (
                            <button onClick={() => setEditingStudioEmail({ id: studio.id, value: studio.auth_email! })}
                              className="text-xs truncate mt-0.5 transition-opacity hover:opacity-70"
                              style={{ color: 'rgba(239,255,66,0.4)', background: 'none', border: 'none', padding: 0, textAlign: 'left' }}
                              title="Corregir mail (typo)">
                              ✉ {studio.auth_email}
                            </button>
                          )
                        )}
                        {!studio.user_id && studio.claim_code && (
                          <button
                            onClick={() => {
                              const url = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://flashttoo.com'}/reclamar-estudio/${studio.claim_code}`
                              navigator.clipboard.writeText(url).catch(() => {})
                              setCopiedStudioLink(studio.id); setTimeout(() => setCopiedStudioLink(null), 2000)
                            }}
                            className="text-xs font-bold px-2.5 py-1 rounded-lg mt-1"
                            style={{ background: copiedStudioLink === studio.id ? 'rgba(74,222,128,0.15)' : 'rgba(239,255,66,0.1)', border: `1px solid ${copiedStudioLink === studio.id ? 'rgba(74,222,128,0.4)' : 'rgba(239,255,66,0.25)'}`, color: copiedStudioLink === studio.id ? '#4ade80' : '#efff42' }}>
                            {copiedStudioLink === studio.id ? '✓ Link copiado' : 'Copiar link para activar'}
                          </button>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="date"
                              value={studioExpiryEdits[studio.id] !== undefined ? studioExpiryEdits[studio.id] : (studio.expires_at ? studio.expires_at.slice(0, 10) : '')}
                              onChange={e => setStudioExpiryEdits(prev => ({ ...prev, [studio.id]: e.target.value }))}
                              className="text-xs rounded-lg py-1 px-2 outline-none"
                              style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${expired ? 'rgba(248,113,113,0.3)' : urgent ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.1)'}`, color: expired ? '#f87171' : urgent ? '#fbbf24' : 'rgba(255,255,255,0.4)', colorScheme: 'dark' }}
                              title="Fecha de vencimiento (vacío = sin vencimiento)"
                            />
                            {studioExpiryEdits[studio.id] !== undefined && (
                              <button
                                disabled={studioExpirySaving[studio.id]}
                                onClick={async () => {
                                  setStudioExpirySaving(prev => ({ ...prev, [studio.id]: true }))
                                  const newDate = studioExpiryEdits[studio.id] || null
                                  await fetch(`/api/admin/studios/${studio.id}`, {
                                    method: 'PATCH',
                                    headers: { ...H(pass), 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ expires_at: newDate }),
                                  })
                                  setAdminStudios(prev => prev.map(s => s.id === studio.id ? { ...s, expires_at: newDate } : s))
                                  setStudioExpiryEdits(prev => { const n = { ...prev }; delete n[studio.id]; return n })
                                  setStudioExpirySaving(prev => ({ ...prev, [studio.id]: false }))
                                }}
                                className="text-xs px-2 py-1 rounded-lg font-bold"
                                style={{ background: 'rgba(239,255,66,0.15)', color: '#efff42', border: '1px solid rgba(239,255,66,0.3)', opacity: studioExpirySaving[studio.id] ? 0.5 : 1 }}>
                                {studioExpirySaving[studio.id] ? '...' : 'Guardar'}
                              </button>
                            )}
                            {daysLeft !== null && studioExpiryEdits[studio.id] === undefined && (
                              <span className="text-xs font-bold" style={{ color: expired ? '#f87171' : urgent ? '#fbbf24' : 'rgba(255,255,255,0.3)' }}>
                                {expired ? `venció hace ${Math.abs(daysLeft)}d` : `vence en ${daysLeft}d`}
                              </span>
                            )}
                          </div>
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
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => setPreviewStudioSlug(studio.slug)}
                      className="text-xs px-3 py-1.5 rounded-lg font-bold"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)' }}>
                      Ver
                    </button>
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

        ) : tab === 'frases' ? (

          // ── FRASES ──────────────────────────────────────────────────────────
          <div className="flex flex-col gap-6">

            {/* ── Editores de Cultura ── */}
            <div className="rounded-xl p-5 flex flex-col gap-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <p className="text-xs font-bold" style={{ color: '#efff42', letterSpacing: '0.08em' }}>EDITORES DE CULTURA</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <a href="/cultura/panel" target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '3px 8px' }}>
                    Abrir panel ↗
                  </a>
                  <button onClick={() => { setEditorFormOpen(v => !v); setEditorError('') }}
                    style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', background: editorFormOpen ? 'rgba(239,255,66,0.12)' : 'rgba(255,255,255,0.06)', border: `1px solid ${editorFormOpen ? 'rgba(239,255,66,0.4)' : 'rgba(255,255,255,0.12)'}`, borderRadius: 6, color: editorFormOpen ? '#efff42' : 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                    + Agregar editor
                  </button>
                </div>
              </div>

              {/* Lista */}
              {loadingEditors
                ? <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Cargando...</p>
                : culturaEditors.length === 0
                  ? <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Sin editores aún</p>
                  : culturaEditors.map(ed => (
                    <div key={ed.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
                      <div>
                        <p style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{ed.name}</p>
                        <button type="button" onClick={() => setShowPassFor(showPassFor === ed.id ? null : ed.id)}
                          style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                          {ed.email}
                        </button>
                        {showPassFor === ed.id && ed.password_plain && (
                          <p style={{ fontSize: 11, marginTop: 4, color: '#efff42', fontFamily: 'monospace', background: 'rgba(239,255,66,0.06)', padding: '3px 7px', borderRadius: 5, display: 'inline-block' }}>
                            {ed.password_plain}
                          </p>
                        )}
                        {showPassFor === ed.id && !ed.password_plain && (
                          <p style={{ fontSize: 11, marginTop: 4, color: 'rgba(255,255,255,0.25)' }}>Contraseña no guardada</p>
                        )}
                      </div>
                      <button onClick={async () => {
                        await fetch('/api/admin/cultura-editors', { method: 'DELETE', headers: { ...H(pass), 'Content-Type': 'application/json' }, body: JSON.stringify({ id: ed.id }) })
                        setCulturaEditors(prev => prev.filter(e => e.id !== ed.id))
                      }} style={{ fontSize: 18, color: 'rgba(255,80,80,0.4)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, padding: '0 4px', flexShrink: 0 }}>×</button>
                    </div>
                  ))
              }

              {/* Formulario agregar (colapsable) */}
              {editorFormOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
                  <input value={editorForm.name} onChange={e => setEditorForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Nombre" className={iCls} />
                  <input value={editorForm.email} onChange={e => setEditorForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="Email" type="email" className={iCls} />
                  <input value={editorForm.password} onChange={e => setEditorForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Contraseña" type="text" className={iCls} />
                  {editorError && <p style={{ fontSize: 11, color: '#f87171' }}>{editorError}</p>}
                  <button disabled={savingEditor || !editorForm.email || !editorForm.name || !editorForm.password}
                    onClick={async () => {
                      setSavingEditor(true); setEditorError('')
                      const r = await fetch('/api/admin/cultura-editors', { method: 'POST', headers: { ...H(pass), 'Content-Type': 'application/json' }, body: JSON.stringify(editorForm) })
                      const d = await r.json()
                      setSavingEditor(false)
                      if (!r.ok) { setEditorError(d.error || 'Error'); return }
                      setCulturaEditors(prev => [d.editor, ...prev])
                      setEditorForm({ email: '', name: '', password: '' })
                      setEditorFormOpen(false)
                    }}
                    className="py-2 px-4 rounded-lg text-xs font-bold disabled:opacity-40"
                    style={{ background: '#efff42', color: '#000', border: 'none', cursor: 'pointer' }}>
                    {savingEditor ? 'Guardando…' : '+ Agregar editor'}
                  </button>
                </div>
              )}
            </div>

            {/* Formulario nueva frase */}
            <div className="rounded-xl p-5 flex flex-col gap-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-bold" style={{ color: '#efff42', letterSpacing: '0.08em' }}>NUEVA FRASE</p>

              {/* Preview imagen */}
              <label className="cursor-pointer block">
                <p className="text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Imagen</p>
                {phrasePreview ? (
                  <div className="relative rounded-xl overflow-hidden" style={{ paddingBottom: '60%' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={phrasePreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>cambiar imagen</span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl flex items-center justify-center"
                    style={{ height: 120, background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)' }}>
                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>subir imagen</span>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={e => {
                  const f = e.target.files?.[0] ?? null
                  setPhraseImage(f)
                  setPhrasePreview(f ? URL.createObjectURL(f) : null)
                }} />
              </label>

              {/* Editor de contenido */}
              <div>
                <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Contenido (opcional)</p>
                <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
                  {[
                    { label: 'H1', title: 'Título  →  # ', fn: () => insertPhrasePrefix('# ') },
                    { label: 'H2', title: 'Subtítulo  →  ## ', fn: () => insertPhrasePrefix('## ') },
                    { label: 'B',  title: 'Negrita  →  **texto**', fn: () => wrapPhraseText('**', '**') },
                    { label: '==', title: 'Texto amarillo  →  ==texto==', fn: () => wrapPhraseText('==', '==') },
                    { label: '"',  title: 'Cita destacada  →  > texto', fn: () => insertPhrasePrefix('> ') },
                    { label: '—',  title: 'Separador', fn: () => insertPhraseText('\n---\n') },
                    { label: '¶',  title: 'Párrafo nuevo', fn: () => insertPhraseText('\n\n') },
                  ].map(b => (
                    <button key={b.label} type="button" title={b.title} onClick={b.fn}
                      style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 4, color: 'rgba(255,255,255,0.55)', cursor: 'pointer', lineHeight: 1 }}>
                      {b.label}
                    </button>
                  ))}
                  <button type="button" disabled={uploadingImg} title="Insertar imagen"
                    onClick={() => phraseImgInputRef.current?.click()}
                    style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 4, color: uploadingImg ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.55)', cursor: 'pointer', lineHeight: 1 }}>
                    {uploadingImg ? '...' : '📷'}
                  </button>
                  <button type="button" title="Insertar enlace" onClick={() => { setShowPhraseLinkForm(v => !v); setPhraseLinkFormVal({ url: '', label: '' }) }}
                    style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', background: showPhraseLinkForm ? 'rgba(239,255,66,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${showPhraseLinkForm ? 'rgba(239,255,66,0.4)' : 'rgba(255,255,255,0.11)'}`, borderRadius: 4, color: showPhraseLinkForm ? '#efff42' : 'rgba(255,255,255,0.55)', cursor: 'pointer', lineHeight: 1 }}>
                    🔗
                  </button>
                  <input ref={phraseImgInputRef} type="file" accept="image/*" hidden
                    onChange={e => {
                      const file = e.target.files?.[0]; if (!file) return
                      e.target.value = ''
                      const ta = phraseDescRef.current
                      const pos = ta?.selectionStart ?? phraseForm.description.length
                      uploadContentImg(file, text => {
                        const cur = phraseForm.description
                        const newVal = cur.slice(0, pos) + (pos > 0 && cur[pos - 1] !== '\n' ? '\n' : '') + text + '\n' + cur.slice(pos)
                        setPhraseForm(f => ({ ...f, description: newVal }))
                      })
                    }} />
                </div>
                {showPhraseLinkForm && (
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap', padding: '6px 8px', background: 'rgba(239,255,66,0.05)', border: '1px solid rgba(239,255,66,0.15)', borderRadius: 6 }}>
                    <input value={phraseLinkFormVal.url} onChange={e => setPhraseLinkFormVal(p => ({ ...p, url: e.target.value }))}
                      placeholder="https://..." style={{ flex: 2, minWidth: 120, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 5, padding: '4px 8px', fontSize: 11, color: '#fff', outline: 'none' }} />
                    <input value={phraseLinkFormVal.label} onChange={e => setPhraseLinkFormVal(p => ({ ...p, label: e.target.value }))}
                      placeholder="Ver publicación original" style={{ flex: 2, minWidth: 120, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 5, padding: '4px 8px', fontSize: 11, color: '#fff', outline: 'none' }} />
                    <button type="button" onClick={() => {
                      const url = phraseLinkFormVal.url.trim(); if (!url) return
                      const label = phraseLinkFormVal.label.trim() || 'Ver publicación original'
                      const ta = phraseDescRef.current
                      const pos = ta?.selectionStart ?? phraseForm.description.length
                      const tag = `[link:${url}|${label}]`
                      const cur = phraseForm.description
                      const newVal = cur.slice(0, pos) + (pos > 0 && cur[pos - 1] !== '\n' ? '\n' : '') + tag + '\n' + cur.slice(pos)
                      setPhraseForm(f => ({ ...f, description: newVal }))
                      setShowPhraseLinkForm(false)
                    }} style={{ padding: '4px 10px', borderRadius: 5, background: '#efff42', border: 'none', color: '#000', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>Insertar</button>
                    <button type="button" onClick={() => setShowPhraseLinkForm(false)} style={{ padding: '4px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.06)', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer' }}>✕</button>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <textarea ref={phraseDescRef} value={phraseForm.description}
                    onChange={e => setPhraseForm(f => ({ ...f, description: e.target.value }))}
                    rows={7} placeholder={'# Título\n## Subtítulo\nPárrafo...\n\n?¿Pregunta?'}
                    className={iCls} style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6 }} />
                  <div style={{ padding: '10px 12px', background: '#18181b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, minHeight: 80, overflowY: 'auto' }}>
                    {phraseForm.description
                      ? renderPhraseContent(phraseForm.description)
                      : <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 11 }}>Vista previa en tiempo real...</span>}
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tags</p>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {[...new Set([...PHRASE_TAGS, ...extraPhraseTags, ...phraseTags])].map(tag => {
                    const on = phraseTags.includes(tag)
                    return (
                      <button key={tag} type="button"
                        onClick={() => setPhraseTags(prev => on ? prev.filter(t => t !== tag) : [...prev, tag])}
                        style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, border: `1px solid ${on ? 'rgba(239,255,66,0.5)' : 'rgba(255,255,255,0.1)'}`, background: on ? 'rgba(239,255,66,0.12)' : 'transparent', color: on ? '#efff42' : 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>
                        #{tagLabel(tag)}
                      </button>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <input value={newTagInput} onChange={e => setNewTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const t = newTagInput.trim().toLowerCase().replace(/\s+/g,'-'); if (t) { if (!phraseTags.includes(t)) setPhraseTags(prev => [...prev, t]); setExtraPhraseTags(prev => prev.includes(t) ? prev : [...prev, t]) }; setNewTagInput('') } }}
                    placeholder="nuevo tag..." style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '4px 8px', fontSize: 11, color: '#fff', outline: 'none' }} />
                  <button type="button" onClick={() => { const t = newTagInput.trim().toLowerCase().replace(/\s+/g,'-'); if (t) { if (!phraseTags.includes(t)) setPhraseTags(prev => [...prev, t]); setExtraPhraseTags(prev => prev.includes(t) ? prev : [...prev, t]) }; setNewTagInput('') }}
                    style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(239,255,66,0.15)', border: '1px solid rgba(239,255,66,0.3)', color: '#efff42', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>+ agregar</button>
                </div>
              </div>

              {/* Idioma */}
              <div>
                <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Idioma</p>
                <select value={phraseForm.language_code}
                  onChange={e => setPhraseForm(f => ({ ...f, language_code: e.target.value }))}
                  className={iCls}>
                  <option value="es">Español</option>
                  <option value="en">English</option>
                  <option value="pt">Português</option>
                </select>
              </div>

              {/* Programar publicación */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: phraseScheduled ? 8 : 0 }}>
                  <button
                    type="button"
                    onClick={() => setPhraseScheduled(v => !v)}
                    style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', background: phraseScheduled ? 'rgba(239,255,66,0.12)' : 'rgba(255,255,255,0.06)', border: `1px solid ${phraseScheduled ? 'rgba(239,255,66,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 6, color: phraseScheduled ? '#efff42' : 'rgba(255,255,255,0.45)', cursor: 'pointer' }}>
                    🕐 Programar publicación
                  </button>
                </div>
                {phraseScheduled && (
                  <input
                    type="datetime-local"
                    value={phraseForm.publish_at}
                    onChange={e => setPhraseForm(f => ({ ...f, publish_at: e.target.value }))}
                    className={iCls}
                    style={{ colorScheme: 'dark' }}
                  />
                )}
              </div>

              {phraseError && <p style={{ fontSize: 12, color: '#f87171' }}>{phraseError}</p>}

              <button
                disabled={savingPhrase || !phraseImage}
                onClick={async () => {
                  if (!phraseImage) return
                  setSavingPhrase(true); setPhraseError('')
                  try {
                    const fd = new FormData()
                    fd.append('image', phraseImage)
                    fd.append('description', phraseForm.description)
                    fd.append('language_code', phraseForm.language_code)
                    fd.append('tags', phraseTags.join(','))
                    if (phraseScheduled && phraseForm.publish_at) {
                      fd.append('publish_at', new Date(phraseForm.publish_at).toISOString())
                    }
                    const r = await fetch('/api/phrases', { method: 'POST', headers: { 'x-admin-pass': pass }, body: fd })
                    const d = await r.json()
                    if (!r.ok) throw new Error(d.error || 'Error')
                    setAdminPhrases(prev => [d.phrase, ...prev])
                    setPhraseForm({ description: '', language_code: 'es', publish_at: '' })
                    setPhraseScheduled(false)
                    setPhraseTags([])
                    setPhraseImage(null); setPhrasePreview(null)
                  } catch (err: unknown) {
                    setPhraseError(err instanceof Error ? err.message : 'Error')
                  } finally {
                    setSavingPhrase(false)
                  }
                }}
                className="py-3 rounded-xl text-sm font-bold transition-opacity"
                style={{ background: '#efff42', color: '#000', opacity: (savingPhrase || !phraseImage) ? 0.4 : 1 }}>
                {savingPhrase ? 'Subiendo...' : phraseScheduled && phraseForm.publish_at ? 'Programar frase' : 'Publicar frase'}
              </button>
            </div>

            {/* Lista de frases */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em' }}>
                  FRASES PUBLICADAS ({adminPhrases.length})
                </p>
                <button
                  onClick={async () => {
                    setLoadingPhrases(true)
                    try {
                      const r = await fetch('/api/admin/phrases', { headers: { 'x-admin-pass': pass } })
                      const d = await r.json()
                      if (Array.isArray(d.phrases)) setAdminPhrases(d.phrases)
                    } finally { setLoadingPhrases(false) }
                  }}
                  style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {loadingPhrases ? 'cargando...' : '↻ actualizar'}
                </button>
              </div>

              {/* Grilla compacta */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
                {adminPhrases.map(ph => (
                  <button key={ph.id} type="button"
                    onClick={() => { setExpandedPhraseId(prev => prev === ph.id ? null : ph.id); setEditPhraseId(null) }}
                    style={{ position: 'relative', paddingBottom: '100%', background: '#111', border: expandedPhraseId === ph.id ? '2px solid #efff42' : '2px solid transparent', borderRadius: 6, overflow: 'hidden', cursor: 'pointer' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ph.image_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: ph.active ? 1 : 0.35 }} />
                    {!ph.active && (
                      <div style={{ position: 'absolute', top: 3, left: 3, fontSize: 8, fontWeight: 800, background: 'rgba(0,0,0,0.75)', color: 'rgba(255,200,80,0.9)', padding: '1px 5px', borderRadius: 4, letterSpacing: '0.06em' }}>BORRADOR</div>
                    )}
                    {(ph.tags ?? []).length > 0 && (
                      <div style={{ position: 'absolute', bottom: 3, left: 3, width: 6, height: 6, borderRadius: '50%', background: '#efff42' }} />
                    )}
                    {(ph.view_count ?? 0) > 0 && (
                      <div style={{ position: 'absolute', bottom: 3, right: 3, fontSize: 8, fontWeight: 800, background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.7)', padding: '1px 4px', borderRadius: 8 }}>
                        {ph.view_count}
                      </div>
                    )}
                    {(ph.comment_count ?? 0) > 0 && (
                      <div style={{ position: 'absolute', top: 3, right: 3, fontSize: 8, fontWeight: 800, background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '1px 4px', borderRadius: 8 }}>
                        {ph.comment_count}
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Panel expandido */}
              {expandedPhraseId && (() => {
                const ph = adminPhrases.find(p => p.id === expandedPhraseId)
                if (!ph) return null
                return (
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' }}>
                    {/* Portada pequeña + acciones */}
                    <div style={{ display: 'flex', gap: 10, padding: '10px 12px', alignItems: 'center' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ph.image_url} alt="" style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: '0 0 4px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                          {ph.language_code.toUpperCase()} · {new Date(ph.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                        </p>
                        {/* Estadísticas de vistas */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
                            👁 <strong style={{ color: '#fff' }}>{ph.view_count ?? 0}</strong> vistas
                          </span>
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                            🔗 <strong style={{ color: 'rgba(239,255,66,0.8)' }}>{ph.external_view_count ?? 0}</strong> externas
                          </span>
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                            📱 <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{(ph.view_count ?? 0) - (ph.external_view_count ?? 0)}</strong> app
                          </span>
                          {!ph.active && ph.publish_at && (
                            <span style={{ fontSize: 10, color: 'rgba(239,255,66,0.7)' }}>
                              🕐 <strong>{new Date(ph.publish_at).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</strong>
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          {(ph.tags ?? []).map(t => (
                            <span key={t} style={{ fontSize: 9, fontWeight: 700, background: 'rgba(239,255,66,0.12)', color: '#efff42', padding: '1px 6px', borderRadius: 10 }}>#{t}</span>
                          ))}
                        </div>
                        {ph.slug && (
                          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', margin: '3px 0 0', letterSpacing: '0.02em', wordBreak: 'break-all' }}>
                            /articulo/<span style={{ color: 'rgba(255,255,255,0.4)' }}>{ph.slug}</span>
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                        <button type="button"
                          onClick={() => { setEditPhraseId(prev => prev === ph.id ? null : ph.id); setEditPhraseDesc(ph.description || ''); setEditPhraseLang(ph.language_code); setEditPhraseTags(ph.tags || []); setShowEditLinkForm(false); setEditPhrasePublishAt(ph.publish_at ? new Date(ph.publish_at).toISOString().slice(0,16) : '') }}
                          style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', background: editPhraseId === ph.id ? '#efff42' : 'rgba(255,255,255,0.07)', color: editPhraseId === ph.id ? '#000' : 'rgba(255,255,255,0.6)', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                          {editPhraseId === ph.id ? 'Cerrar editor' : 'Editar'}
                        </button>
                        <button type="button"
                          onClick={async () => {
                            const next = !ph.active
                            await fetch(`/api/phrases/${ph.id}`, { method: 'PATCH', headers: { 'x-admin-pass': pass, 'Content-Type': 'application/json' }, body: JSON.stringify({ active: next }) })
                            setAdminPhrases(prev => prev.map(p => p.id === ph.id ? { ...p, active: next } : p))
                          }}
                          style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', background: ph.active ? 'rgba(74,222,128,0.1)' : 'rgba(255,200,80,0.1)', color: ph.active ? '#4ade80' : 'rgba(255,200,80,0.8)', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                          {ph.active ? '● Publicado' : ph.publish_at && !ph.active ? '🕐 Programado' : '○ Borrador'}
                        </button>
                        <a href={`/articulo/${ph.slug ?? ph.id}`} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: 'none', borderRadius: 6, cursor: 'pointer', textDecoration: 'none', display: 'block', textAlign: 'center' }}>
                          Preview ↗
                        </a>
                        <button type="button"
                          onClick={async () => {
                            if (expandedPhraseId === ph.id && phraseComments[ph.id]) return
                            setLoadingPhraseComments(ph.id)
                            try {
                              const r = await fetch(`/api/phrases/${ph.id}/comments`)
                              const d = await r.json()
                              if (Array.isArray(d.comments)) setPhraseCommentsAdmin(prev => ({ ...prev, [ph.id]: d.comments }))
                            } finally { setLoadingPhraseComments(null) }
                          }}
                          style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', background: 'rgba(255,255,255,0.07)', color: 'rgba(239,255,66,0.7)', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                          {(ph.comment_count ?? 0) > 0 ? `${ph.comment_count} com.` : 'Ver com.'}
                        </button>
                        <button type="button"
                          onClick={async () => {
                            if (!confirm('¿Eliminar?')) return
                            await fetch(`/api/phrases/${ph.id}`, { method: 'DELETE', headers: { 'x-admin-pass': pass } })
                            setAdminPhrases(prev => prev.filter(p => p.id !== ph.id))
                            setExpandedPhraseId(null)
                          }}
                          style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', background: 'rgba(255,50,50,0.15)', color: 'rgba(255,80,80,0.7)', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                          Eliminar
                        </button>
                      </div>
                    </div>

                    {/* Editor */}
                    {editPhraseId === ph.id && (
                      <div style={{ padding: '0 12px 12px' }}>
                        <div style={{ display: 'flex', gap: 4, marginBottom: 5, flexWrap: 'wrap' }}>
                          {[
                            { label: 'H1', fn: () => insertEditPrefix('# ') },
                            { label: 'H2', fn: () => insertEditPrefix('## ') },
                            { label: 'B',  fn: () => wrapEditText('**', '**') },
                            { label: '==', fn: () => wrapEditText('==', '==') },
                            { label: '"',  fn: () => insertEditPrefix('> ') },
                            { label: '—',  fn: () => insertEditText('\n---\n') },
                            { label: '¶',  fn: () => insertEditText('\n\n') },
                          ].map(b => (
                            <button key={b.label} type="button" onClick={b.fn}
                              style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', lineHeight: 1 }}>
                              {b.label}
                            </button>
                          ))}
                          <button type="button" disabled={uploadingImg} onClick={() => editImgInputRef.current?.click()}
                            style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: uploadingImg ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)', cursor: 'pointer', lineHeight: 1 }}>
                            {uploadingImg ? '...' : '📷'}
                          </button>
                          <button type="button" title="Insertar enlace" onClick={() => { setShowEditLinkForm(v => !v); setEditLinkFormVal({ url: '', label: '' }) }}
                            style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', background: showEditLinkForm ? 'rgba(239,255,66,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${showEditLinkForm ? 'rgba(239,255,66,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 4, color: showEditLinkForm ? '#efff42' : 'rgba(255,255,255,0.5)', cursor: 'pointer', lineHeight: 1 }}>
                            🔗
                          </button>
                          <input ref={editImgInputRef} type="file" accept="image/*" hidden
                            onChange={e => {
                              const file = e.target.files?.[0]; if (!file) return
                              e.target.value = ''
                              const ta = editPhraseDescRef.current
                              const pos = ta?.selectionStart ?? editPhraseDesc.length
                              uploadContentImg(file, text => {
                                setEditPhraseDesc(cur => cur.slice(0, pos) + (pos > 0 && cur[pos - 1] !== '\n' ? '\n' : '') + text + '\n' + cur.slice(pos))
                              })
                            }} />
                        </div>
                        {showEditLinkForm && (
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', padding: '5px 7px', marginBottom: 4, background: 'rgba(239,255,66,0.05)', border: '1px solid rgba(239,255,66,0.15)', borderRadius: 5 }}>
                            <input value={editLinkFormVal.url} onChange={e => setEditLinkFormVal(p => ({ ...p, url: e.target.value }))}
                              placeholder="https://..." style={{ flex: 2, minWidth: 100, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '3px 7px', fontSize: 10, color: '#fff', outline: 'none' }} />
                            <input value={editLinkFormVal.label} onChange={e => setEditLinkFormVal(p => ({ ...p, label: e.target.value }))}
                              placeholder="Ver publicación original" style={{ flex: 2, minWidth: 100, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '3px 7px', fontSize: 10, color: '#fff', outline: 'none' }} />
                            <button type="button" onClick={() => {
                              const url = editLinkFormVal.url.trim(); if (!url) return
                              const label = editLinkFormVal.label.trim() || 'Ver publicación original'
                              const ta = editPhraseDescRef.current
                              const pos = ta?.selectionStart ?? editPhraseDesc.length
                              const tag = `[link:${url}|${label}]`
                              setEditPhraseDesc(cur => cur.slice(0, pos) + (pos > 0 && cur[pos - 1] !== '\n' ? '\n' : '') + tag + '\n' + cur.slice(pos))
                              setShowEditLinkForm(false)
                            }} style={{ padding: '3px 9px', borderRadius: 4, background: '#efff42', border: 'none', color: '#000', fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>Insertar</button>
                            <button type="button" onClick={() => setShowEditLinkForm(false)} style={{ padding: '3px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 10, cursor: 'pointer' }}>✕</button>
                          </div>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
                          <textarea ref={editPhraseDescRef} value={editPhraseDesc} onChange={e => setEditPhraseDesc(e.target.value)}
                            rows={6} placeholder={'# Título\n## Subtítulo\nTexto...'}
                            className={iCls} style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 11, lineHeight: 1.6 }} />
                          <div style={{ padding: '8px 10px', background: '#18181b', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, overflowY: 'auto' }}>
                            {editPhraseDesc ? renderPhraseContent(editPhraseDesc) : <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 11 }}>Vista previa...</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                          {[...new Set([...PHRASE_TAGS, ...editExtraPhraseTags, ...editPhraseTags])].map(tag => {
                            const on = editPhraseTags.includes(tag)
                            return (
                              <button key={tag} type="button"
                                onClick={() => setEditPhraseTags(prev => on ? prev.filter(t => t !== tag) : [...prev, tag])}
                                style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, border: `1px solid ${on ? 'rgba(239,255,66,0.5)' : 'rgba(255,255,255,0.1)'}`, background: on ? 'rgba(239,255,66,0.12)' : 'transparent', color: on ? '#efff42' : 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>
                                #{tag}
                              </button>
                            )
                          })}
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                          <input value={editNewTagInput} onChange={e => setEditNewTagInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const t = editNewTagInput.trim().toLowerCase().replace(/\s+/g,'-'); if (t) { if (!editPhraseTags.includes(t)) setEditPhraseTags(prev => [...prev, t]); setEditExtraPhraseTags(prev => prev.includes(t) ? prev : [...prev, t]) }; setEditNewTagInput('') } }}
                            placeholder="nuevo tag..." style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '3px 7px', fontSize: 10, color: '#fff', outline: 'none' }} />
                          <button type="button" onClick={() => { const t = editNewTagInput.trim().toLowerCase().replace(/\s+/g,'-'); if (t) { if (!editPhraseTags.includes(t)) setEditPhraseTags(prev => [...prev, t]); setEditExtraPhraseTags(prev => prev.includes(t) ? prev : [...prev, t]) }; setEditNewTagInput('') }}
                            style={{ padding: '3px 8px', borderRadius: 8, background: 'rgba(239,255,66,0.15)', border: '1px solid rgba(239,255,66,0.3)', color: '#efff42', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>+ agregar</button>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                          <select value={editPhraseLang} onChange={e => setEditPhraseLang(e.target.value)}
                            className={iCls} style={{ width: 70, padding: '4px 6px', fontSize: 11 }}>
                            <option value="es">ES</option>
                            <option value="en">EN</option>
                            <option value="pt">PT</option>
                          </select>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>🕐</span>
                            <input type="datetime-local" value={editPhrasePublishAt}
                              onChange={e => setEditPhrasePublishAt(e.target.value)}
                              className={iCls} style={{ fontSize: 10, padding: '3px 6px', colorScheme: 'dark' }} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button type="button" disabled={savingEditPhrase}
                            onClick={async () => {
                              setSavingEditPhrase(true)
                              try {
                                const payload: Record<string, unknown> = { description: editPhraseDesc || null, language_code: editPhraseLang, tags: editPhraseTags }
                                if (editPhrasePublishAt) payload.publish_at = new Date(editPhrasePublishAt).toISOString()
                                else payload.publish_at = null
                                const r = await fetch(`/api/phrases/${ph.id}`, {
                                  method: 'PATCH',
                                  headers: { 'x-admin-pass': pass, 'Content-Type': 'application/json' },
                                  body: JSON.stringify(payload),
                                })
                                if (r.ok) {
                                  setAdminPhrases(prev => prev.map(p => p.id === ph.id ? { ...p, description: editPhraseDesc || null, language_code: editPhraseLang, tags: editPhraseTags, publish_at: editPhrasePublishAt ? new Date(editPhrasePublishAt).toISOString() : null } : p))
                                  setEditPhraseId(null)
                                }
                              } finally { setSavingEditPhrase(false) }
                            }}
                            style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', background: '#efff42', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                            {savingEditPhrase ? 'Guardando...' : 'Guardar'}
                          </button>
                          <button type="button" onClick={() => setEditPhraseId(null)}
                            style={{ fontSize: 11, padding: '4px 12px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Comentarios */}
                    {phraseComments[ph.id] && (
                      <div style={{ padding: '0 12px 12px' }}>
                        {loadingPhraseComments === ph.id ? (
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>cargando...</p>
                        ) : (phraseComments[ph.id] || []).length === 0 ? (
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>Sin comentarios</p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {(phraseComments[ph.id] || []).map(c => (
                              <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                                <span style={{ fontSize: 18 }}>{c.guest_emoji || '👤'}</span>
                                <div style={{ flex: 1 }}>
                                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>{c.artist_name || c.guest_name}</p>
                                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.4 }}>{c.content}</p>
                                </div>
                                <button onClick={async () => {
                                    await fetch(`/api/phrases/${ph.id}/comments/${c.id}`, { method: 'DELETE', headers: { 'x-admin-pass': pass } })
                                    setPhraseCommentsAdmin(prev => ({ ...prev, [ph.id]: (prev[ph.id] || []).filter(x => x.id !== c.id) }))
                                  }}
                                  style={{ fontSize: 10, color: 'rgba(255,80,80,0.5)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>✕</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })()}

              {adminPhrases.length === 0 && !loadingPhrases && (
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '20px 0' }}>
                  No hay frases publicadas todavía.
                </p>
              )}
            </div>

          </div>

        ) : tab === 'culturavideos' ? (

          // ── CULTURA VIDEOS ────────────────────────────────────────────────────
          <CulturaVideosAdmin pass={pass} />

        ) : tab === 'insumosvideo' ? (

          // ── VIDEO INSUMOS ─────────────────────────────────────────────────────
          <InsumosVideoAdmin pass={pass} />

        ) : tab === 'comunidad' ? (

          // ── COMUNIDAD ─────────────────────────────────────────────────────────
          <AdminCommunity pass={pass} />

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
                    background: 'rgba(255,255,255,0.06)',
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
      {/* ── PREVIEW MODAL ─────────────────────────────────────────────────── */}
      {previewArtist && (() => {
        const iv = (previewArtist.interview ?? {}) as Record<string, string>
        const answeredQ = INTERVIEW_QUESTIONS.filter(q => iv[q.key]?.trim())
        const galleryPhotos = [previewArtist.gallery_photo_1, previewArtist.gallery_photo_2, previewArtist.gallery_photo_3].filter(Boolean) as string[]
        return (
          <div
            onClick={() => setPreviewArtist(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', backdropFilter: 'blur(4px)' }}>
            <div
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 390, height: '100dvh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '20px 16px 32px' }}>

              {/* Misma card que el perfil público */}
              <div style={{ background: '#111', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 40px 100px rgba(0,0,0,0.9)', overflow: 'hidden' }}>

                {/* Foto con degradé */}
                <div style={{ position: 'relative', width: '100%', paddingBottom: '115%' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewArtist.photo_url} alt={previewArtist.name}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #111 0%, rgba(0,0,0,0.5) 50%, transparent 100%)' }} />
                  <button onClick={() => setPreviewArtist(null)}
                    style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', fontSize: 18, cursor: 'pointer' }}>
                    ×
                  </button>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 }}>
                    <h2 style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1, color: '#fff', overflowWrap: 'break-word', margin: 0 }}>{previewArtist.name}</h2>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4, marginBottom: 0 }}>{previewArtist.city}, {previewArtist.country}</p>
                  </div>
                </div>

                {/* Contenido */}
                <div style={{ padding: '12px 20px 20px' }}>
                  {/* Estilos */}
                  {previewArtist.styles && previewArtist.styles.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                      {previewArtist.styles.map(s => (
                        <span key={s} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 99, background: 'rgba(239,255,66,0.06)', border: '1px solid rgba(239,255,66,0.18)', color: 'rgba(239,255,66,0.75)' }}>{s}</span>
                      ))}
                    </div>
                  )}

                  {/* Bio */}
                  {previewArtist.bio && (
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: 16 }}>{previewArtist.bio}</p>
                  )}

                  {/* Galería */}
                  {galleryPhotos.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 16 }}>
                      {galleryPhotos.map((src, i) => (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img key={i} src={src} alt=""
                          style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 12 }} />
                      ))}
                    </div>
                  )}

                  <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 16 }} />

                  {/* Contacto */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {previewArtist.instagram && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em', margin: 0 }}>Instagram</p>
                        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 16 }}>↗</span>
                      </div>
                    )}
                    {previewArtist.whatsapp && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em', margin: 0 }}>WhatsApp</p>
                        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 16 }}>↗</span>
                      </div>
                    )}
                    {previewArtist.email && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em', margin: 0 }}>Email</p>
                        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>⎘</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Entrevista — tarjeta amarilla igual que en el público */}
              {answeredQ.length > 0 && (
                <div style={{ background: '#efff42', borderRadius: 20, padding: '22px 20px 24px', boxShadow: '0 40px 100px rgba(0,0,0,0.9)' }}>
                  <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.35)', textTransform: 'uppercase', marginBottom: 20 }}>
                    Conocé a {previewArtist.name}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {answeredQ.map(q => (
                      <div key={q.key}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(0,0,0,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 5, lineHeight: 1.4 }}>{q.label}</p>
                        <p style={{ fontSize: 14, color: '#000', lineHeight: 1.65, margin: 0 }}>{iv[q.key]}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Acciones admin */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                {previewArtist.auth_email && (
                  <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,255,66,0.04)', border: '1px solid rgba(239,255,66,0.12)' }}>
                    <p style={{ fontSize: 11, color: 'rgba(239,255,66,0.6)', margin: 0 }}>Mail de acceso: <strong style={{ color: '#efff42' }}>{previewArtist.auth_email}</strong></p>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => { approveArtist(previewArtist.id); setPreviewArtist(null) }}
                    style={{ flex: 1, padding: '12px 0', borderRadius: 12, fontWeight: 700, fontSize: 13, background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.35)', color: '#4ade80', cursor: 'pointer' }}>
                    Aprobar
                  </button>
                  <button
                    onClick={() => { rejectArtist(previewArtist.id); setPreviewArtist(null) }}
                    style={{ flex: 1, padding: '12px 0', borderRadius: 12, fontWeight: 700, fontSize: 13, background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.25)', color: 'rgba(255,100,100,0.7)', cursor: 'pointer' }}>
                    Rechazar
                  </button>
                </div>
              </div>

            </div>
            </div>
          </div>
        )
      })()}
      {/* Preview estudio */}
      {previewStudioSlug && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
          onClick={e => { if (e.target === e.currentTarget) setPreviewStudioSlug(null) }}>
          <div style={{ minHeight: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '16px' }}>
            <div style={{ width: '100%', maxWidth: 480, position: 'relative' }}>
              <button
                onClick={() => setPreviewStudioSlug(null)}
                style={{ position: 'absolute', top: -12, right: 0, zIndex: 1, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: 20, padding: '4px 12px', fontSize: 13, cursor: 'pointer' }}>
                ✕ Cerrar
              </button>
              <StudioPanel
                slug={previewStudioSlug}
                onClose={() => setPreviewStudioSlug(null)}
                onOpenArtist={() => {}}
                adminPass={pass}
              />
            </div>
          </div>
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

type AdminPost = { id: string; content: string; lang: string; created_at: string; expires_at?: string; type: string; client_name?: string; artist_name?: string; studio_name?: string; report_count?: number; city?: string; country?: string; search_category?: string | null; search_size?: string | null; search_zones?: string[] | null; search_style?: string | null; contact_type?: string | null; contact?: string | null; link?: string | null }

function AdminCommunity({ pass }: { pass: string }) {
  const LANGS = ['es', 'en', 'pt', 'fr', 'de', 'it']
  const [text, setText] = useState('')
  const [lang, setLang] = useState('es')
  const [kind, setKind] = useState<'admin' | 'news'>('admin')
  const [link, setLink] = useState('')
  const [country, setCountry] = useState('')
  const [postCity, setPostCity] = useState('')
  const [customExpiry, setCustomExpiry] = useState('')
  const [notify, setNotify] = useState(false)
  const [postPhoto, setPostPhoto] = useState<File | null>(null)
  const [postPhotoPreview, setPostPhotoPreview] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<'ok' | 'error' | null>(null)
  const [adminPosts, setAdminPosts] = useState<AdminPost[]>([])
  const [reportedPosts, setReportedPosts] = useState<AdminPost[]>([])
  const [searchPosts, setSearchPosts] = useState<AdminPost[]>([])
  const [clientPosts, setClientPosts] = useState<AdminPost[]>([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [searchLimitDraft, setSearchLimitDraft] = useState('')
  const [savingSearchLimit, setSavingSearchLimit] = useState(false)
  const [artistLimitDraft, setArtistLimitDraft] = useState('')
  const [savingArtistLimit, setSavingArtistLimit] = useState(false)
  const [studioLimitDraft, setStudioLimitDraft] = useState('')
  const [savingStudioLimit, setSavingStudioLimit] = useState(false)
  const [pushStats, setPushStats] = useState<{ total: number; withoutCountry: number; neverConfirmed: number; byCountry: [string, number][] } | null>(null)
  const [searchExpiryDraft, setSearchExpiryDraft] = useState('')
  const [savingSearchExpiry, setSavingSearchExpiry] = useState(false)
  const [tickerMode, setTickerMode] = useState(false)
  const [savingTickerMode, setSavingTickerMode] = useState(false)
  const [pushVisible, setPushVisible] = useState(false)
  const [savingPushVisible, setSavingPushVisible] = useState(false)
  const [closings, setClosings] = useState<{ id: string; label_es: string; label_en: string; label_pt: string; phrase_es: string; phrase_en: string; phrase_pt: string }[]>([])
  const [newClosingLabelEs, setNewClosingLabelEs] = useState('')
  const [newClosingLabelEn, setNewClosingLabelEn] = useState('')
  const [newClosingLabelPt, setNewClosingLabelPt] = useState('')
  const [newClosingEs, setNewClosingEs] = useState('')
  const [newClosingEn, setNewClosingEn] = useState('')
  const [newClosingPt, setNewClosingPt] = useState('')
  const [savingClosings, setSavingClosings] = useState(false)

  const loadPosts = async () => {
    setLoadingPosts(true)
    const r = await fetch('/api/admin/community', { headers: { 'x-admin-pass': pass } }).catch(() => null)
    if (r?.ok) {
      const d = await r.json()
      setAdminPosts(d.adminPosts ?? [])
      setReportedPosts(d.reportedPosts ?? [])
      setSearchPosts(d.searchPosts ?? [])
      setClientPosts(d.clientPosts ?? [])
    }
    setLoadingPosts(false)
  }

  useEffect(() => {
    loadPosts()
    fetch('/api/admin/settings', { headers: { 'x-admin-pass': pass } })
      .then(r => r.json())
      .then(d => {
        setSearchLimitDraft(String(d?.settings?.search_wizard_daily_limit ?? '15'))
        setArtistLimitDraft(String(d?.settings?.artist_daily_post_limit ?? '0'))
        setStudioLimitDraft(String(d?.settings?.studio_daily_post_limit ?? '0'))
        setSearchExpiryDraft(String(d?.settings?.search_wizard_expiry_days ?? '7'))
        setTickerMode(d?.settings?.search_ticker_mode === true)
        setPushVisible(d?.settings?.push_notifications_visible === true)
        setClosings(Array.isArray(d?.settings?.client_request_closings) ? d.settings.client_request_closings : [])
      })
      .catch(() => {})
    fetch('/api/admin/push-stats', { headers: { 'x-admin-pass': pass } })
      .then(r => r.json())
      .then(d => { if (!d?.error) setPushStats(d) })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const saveClosings = async (next: { id: string; label_es: string; label_en: string; label_pt: string; phrase_es: string; phrase_en: string; phrase_pt: string }[]) => {
    setSavingClosings(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-pass': pass },
        body: JSON.stringify({ key: 'client_request_closings', value: next }),
      })
      setClosings(next)
    } finally { setSavingClosings(false) }
  }

  const addClosing = () => {
    if (!newClosingLabelEs.trim() || !newClosingEs.trim()) return
    // En/pt quedan vacíos de verdad si no se completan — el fallback a español
    // se resuelve al mostrarlo (según el idioma del que está escribiendo), no
    // se copia acá, así "opcional" es opcional también en lo que queda guardado.
    const next = [...closings, {
      id: crypto.randomUUID(),
      label_es: newClosingLabelEs.trim(),
      label_en: newClosingLabelEn.trim(),
      label_pt: newClosingLabelPt.trim(),
      phrase_es: newClosingEs.trim(),
      phrase_en: newClosingEn.trim(),
      phrase_pt: newClosingPt.trim(),
    }]
    saveClosings(next)
    setNewClosingLabelEs(''); setNewClosingLabelEn(''); setNewClosingLabelPt('')
    setNewClosingEs(''); setNewClosingEn(''); setNewClosingPt('')
  }

  const deleteClosing = (id: string) => {
    saveClosings(closings.filter(c => c.id !== id))
  }

  const toggleTickerMode = async () => {
    const next = !tickerMode
    setSavingTickerMode(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-pass': pass },
        body: JSON.stringify({ key: 'search_ticker_mode', value: next }),
      })
      setTickerMode(next)
    } finally { setSavingTickerMode(false) }
  }

  const togglePushVisible = async () => {
    const next = !pushVisible
    setSavingPushVisible(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-pass': pass },
        body: JSON.stringify({ key: 'push_notifications_visible', value: next }),
      })
      setPushVisible(next)
    } finally { setSavingPushVisible(false) }
  }

  const saveSearchLimit = async () => {
    const n = parseInt(searchLimitDraft, 10)
    if (!Number.isFinite(n) || n < 0) return
    setSavingSearchLimit(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-pass': pass },
        body: JSON.stringify({ key: 'search_wizard_daily_limit', value: String(n) }),
      })
    } finally { setSavingSearchLimit(false) }
  }

  const saveArtistLimit = async () => {
    const n = parseInt(artistLimitDraft, 10)
    if (!Number.isFinite(n) || n < 0) return
    setSavingArtistLimit(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-pass': pass },
        body: JSON.stringify({ key: 'artist_daily_post_limit', value: String(n) }),
      })
    } finally { setSavingArtistLimit(false) }
  }

  const saveStudioLimit = async () => {
    const n = parseInt(studioLimitDraft, 10)
    if (!Number.isFinite(n) || n < 0) return
    setSavingStudioLimit(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-pass': pass },
        body: JSON.stringify({ key: 'studio_daily_post_limit', value: String(n) }),
      })
    } finally { setSavingStudioLimit(false) }
  }

  const saveSearchExpiry = async () => {
    const n = parseInt(searchExpiryDraft, 10)
    if (!Number.isFinite(n) || n < 1) return
    setSavingSearchExpiry(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-pass': pass },
        body: JSON.stringify({ key: 'search_wizard_expiry_days', value: String(n) }),
      })
    } finally { setSavingSearchExpiry(false) }
  }

  const deletePost = async (id: string) => {
    await fetch('/api/admin/community', { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-pass': pass }, body: JSON.stringify({ id }) })
    setAdminPosts(prev => prev.filter(p => p.id !== id))
    setReportedPosts(prev => prev.filter(p => p.id !== id))
    setSearchPosts(prev => prev.filter(p => p.id !== id))
    setClientPosts(prev => prev.filter(p => p.id !== id))
  }

  const send = async () => {
    if (!text.trim()) return
    setSending(true); setResult(null)
    const fd = new FormData()
    fd.append('content', text)
    fd.append('lang', lang)
    fd.append('kind', kind)
    if (link.trim()) fd.append('link', link.trim())
    if (country.trim()) fd.append('country', country.trim())
    if (postCity.trim()) fd.append('city', postCity.trim())
    if (customExpiry) fd.append('expires_at', new Date(customExpiry).toISOString())
    fd.append('notify', String(notify))
    if (postPhoto) fd.append('photo', postPhoto)
    const r = await fetch('/api/admin/community', {
      method: 'POST',
      headers: { 'x-admin-pass': pass },
      body: fd,
    }).catch(() => null)
    setSending(false)
    if (r?.ok) {
      setText(''); setLink(''); setCountry(''); setPostCity(''); setCustomExpiry(''); setNotify(false)
      setPostPhoto(null); setPostPhotoPreview(null)
      setResult('ok'); loadPosts()
    }
    else setResult('error')
  }

  const postName = (p: AdminPost) => p.client_name ?? p.artist_name ?? p.studio_name ?? '—'
  const timeAgoAdmin = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    return `${Math.floor(diff / 86400)}d`
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Composer */}
      <div className="rounded-xl p-5 flex flex-col gap-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex gap-2">
          <button onClick={() => setKind('admin')}
            style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, border: `1px solid ${kind === 'admin' ? '#efff42' : 'rgba(255,255,255,0.1)'}`, background: kind === 'admin' ? 'rgba(239,255,66,0.1)' : 'transparent', color: kind === 'admin' ? '#efff42' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
            Oficial
          </button>
          <button onClick={() => setKind('news')}
            style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, border: `1px solid ${kind === 'news' ? '#f472b6' : 'rgba(255,255,255,0.1)'}`, background: kind === 'news' ? 'rgba(244,114,182,0.1)' : 'transparent', color: kind === 'news' ? '#f472b6' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
            Noticias / Info
          </button>
        </div>
        <div className="flex items-center gap-3">
          {kind === 'admin' ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src="/icon-desktop-512.png" alt="Flashttoo" style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid #efff42', background: '#000', objectFit: 'contain', padding: 4 }} />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid #f472b6', background: 'rgba(244,114,182,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 0 1-5.8-1.4"/></svg>
            </div>
          )}
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>Flashttoo</p>
            <p style={{ fontSize: 10, fontWeight: 700, color: kind === 'admin' ? '#efff42' : '#f472b6', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {kind === 'admin' ? 'Oficial' : 'Info'}
            </p>
          </div>
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Escribí el mensaje para la comunidad..."
          maxLength={300}
          rows={4}
          style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.55 }}
        />
        <div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>Foto opcional (ej. flyer de convención)</p>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer">
              {postPhotoPreview ? (
                <div className="rounded-lg overflow-hidden" style={{ width: 90, height: 60, border: '1px solid rgba(255,255,255,0.1)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={postPhotoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ) : (
                <div className="rounded-lg flex items-center justify-center text-xs" style={{ width: 90, height: 60, border: '2px dashed rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.2)' }}>
                  subir foto
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={e => {
                const file = e.target.files?.[0]; if (!file) return
                setPostPhoto(file); setPostPhotoPreview(URL.createObjectURL(file))
              }} />
            </label>
            {postPhotoPreview && (
              <button type="button" onClick={() => { setPostPhoto(null); setPostPhotoPreview(null) }}
                className="text-xs" style={{ color: 'rgba(255,80,80,0.6)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Quitar foto
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input type="url" value={link} onChange={e => setLink(e.target.value)}
            placeholder="Link opcional (ej. a la publicación de Instagram)"
            style={{ flex: '1 1 260px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 11px', color: '#fff', fontSize: 12, outline: 'none' }} />
          <input value={country} onChange={e => setCountry(e.target.value)}
            placeholder="País opcional (ej: Argentina, Chile) — vacío = todos"
            style={{ flex: '1 1 220px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 11px', color: '#fff', fontSize: 12, outline: 'none' }} />
          <input value={postCity} onChange={e => setPostCity(e.target.value)}
            placeholder="Ciudad opcional (ej: Rosario) — refina el país"
            style={{ flex: '1 1 220px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 11px', color: '#fff', fontSize: 12, outline: 'none' }} />
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Vence el</span>
            <input type="datetime-local" value={customExpiry} onChange={e => setCustomExpiry(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 8px', color: '#fff', fontSize: 12, outline: 'none', colorScheme: 'dark' }} />
            {customExpiry && (
              <button onClick={() => setCustomExpiry('')} style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            )}
          </div>
          {!customExpiry && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>(default: 7 días)</span>}
        </div>
        <label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
            Enviar también como notificación push {postCity.trim() ? `(solo ${postCity.trim()}${country.trim() ? `, ${country.trim()}` : ''})` : country.trim() ? `(solo ${country.trim()})` : '(a todos)'}
          </span>
        </label>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {LANGS.map(l => (
              <button key={l} onClick={() => setLang(l)}
                style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, border: `1px solid ${lang === l ? '#efff42' : 'rgba(255,255,255,0.1)'}`, background: lang === l ? 'rgba(239,255,66,0.1)' : 'transparent', color: lang === l ? '#efff42' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                {l}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginLeft: 'auto' }}>{text.length}/300</span>
          <button onClick={send} disabled={sending || !text.trim()}
            style={{ padding: '8px 20px', borderRadius: 20, fontSize: 13, fontWeight: 700, background: text.trim() ? '#efff42' : 'rgba(255,255,255,0.08)', color: text.trim() ? '#000' : 'rgba(255,255,255,0.3)', border: 'none', cursor: text.trim() ? 'pointer' : 'default' }}>
            {sending ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
        {result === 'ok' && <p style={{ fontSize: 12, color: '#4ade80' }}>Publicado correctamente ✓</p>}
        {result === 'error' && <p style={{ fontSize: 12, color: '#f87171' }}>Error al publicar</p>}
      </div>

      {/* Mis posts */}
      <div className="flex flex-col gap-3">
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Mis publicaciones ({adminPosts.length})</p>
        {loadingPosts ? <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Cargando...</p> : adminPosts.length === 0
          ? <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Sin publicaciones aún.</p>
          : adminPosts.map(p => (
            <div key={p.id} className="rounded-xl p-4 flex gap-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${p.type === 'news' ? 'rgba(244,114,182,0.15)' : 'rgba(239,255,66,0.1)'}` }}>
              <div style={{ flex: 1 }}>
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ fontSize: 9, fontWeight: 700, color: p.type === 'news' ? '#f472b6' : '#efff42', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{p.type === 'news' ? 'Info' : 'Oficial'}</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{p.lang}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{timeAgoAdmin(p.created_at)}</span>
                </div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{p.content}</p>
                {p.link && (
                  <a href={p.link} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 11, color: '#38bdf8', textDecoration: 'none' }}>
                    🔗 {p.link}
                  </a>
                )}
                {p.country && (
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>🌍 {p.country}</p>
                )}
                {p.expires_at && (
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>
                    Vence: {new Date(p.expires_at).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
              <button onClick={() => deletePost(p.id)}
                style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 8, color: '#f87171', fontSize: 12, padding: '4px 10px', cursor: 'pointer', alignSelf: 'flex-start', flexShrink: 0 }}>
                Borrar
              </button>
            </div>
          ))}
      </div>

      {/* Búsquedas del asistente */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(251,146,60,0.7)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>🔍 Búsquedas ({searchPosts.length})</p>
          <button onClick={loadPosts} style={{ fontSize: 12, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 0 }}>↻ actualizar</button>
          <div className="flex items-center gap-2" style={{ marginLeft: 'auto' }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Máx. por dispositivo/día</span>
            <input type="number" min={0} value={searchLimitDraft} onChange={e => setSearchLimitDraft(e.target.value)}
              className="w-16 px-2 py-1 rounded-lg text-xs"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', outline: 'none' }} />
            <button onClick={saveSearchLimit} disabled={savingSearchLimit}
              className="text-xs font-bold px-2.5 py-1 rounded-lg disabled:opacity-50"
              style={{ background: 'rgba(251,146,60,0.1)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.25)' }}>
              {savingSearchLimit ? '...' : 'Guardar'}
            </button>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginLeft: 10 }}>Días que permanecen</span>
            <input type="number" min={1} value={searchExpiryDraft} onChange={e => setSearchExpiryDraft(e.target.value)}
              className="w-16 px-2 py-1 rounded-lg text-xs"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', outline: 'none' }} />
            <button onClick={saveSearchExpiry} disabled={savingSearchExpiry}
              className="text-xs font-bold px-2.5 py-1 rounded-lg disabled:opacity-50"
              style={{ background: 'rgba(251,146,60,0.1)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.25)' }}>
              {savingSearchExpiry ? '...' : 'Guardar'}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTickerMode} disabled={savingTickerMode}
            className="relative rounded-full transition-colors disabled:opacity-50"
            style={{ width: 36, height: 20, background: tickerMode ? '#fb923c' : 'rgba(255,255,255,0.15)', flexShrink: 0 }}>
            <span className="absolute rounded-full bg-white transition-transform"
              style={{ width: 16, height: 16, top: 2, left: tickerMode ? 18 : 2 }} />
          </button>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
            Ocultar de comunidad — las búsquedas sin texto no aparecen en el feed público (siguen acá, para vos)
          </span>
        </div>
        {loadingPosts ? null : searchPosts.length === 0
          ? <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Sin búsquedas todavía.</p>
          : (
            <div className="flex flex-col gap-3" style={{ maxHeight: 480, overflowY: 'auto', paddingRight: 4 }}>
              {searchPosts.map(p => (
                <div key={p.id} className="rounded-xl p-4 flex gap-3"
                  style={{ background: 'rgba(251,146,60,0.04)', border: '1px solid rgba(251,146,60,0.15)' }}>
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{p.lang}</span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{timeAgoAdmin(p.created_at)}</span>
                      {p.contact && (
                        <span style={{ fontSize: 10, color: '#38bdf8' }}>· {p.contact_type}: {p.contact}</span>
                      )}
                    </div>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{p.content}</p>
                  </div>
                  <button onClick={() => deletePost(p.id)}
                    style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 8, color: '#f87171', fontSize: 12, padding: '4px 10px', cursor: 'pointer', alignSelf: 'flex-start', flexShrink: 0 }}>
                    Borrar
                  </button>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* Cierres del pedido de cliente ("Busco tattoo artist...") — se suman a los 4 fijos del código */}
      <div className="flex flex-col gap-3">
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(96,165,250,0.7)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Cierres del pedido de cliente</p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5, margin: 0 }}>
          Opciones extra para el chip "Cierre" del pedido de cliente en comunidad (además de las 4 fijas). Español es obligatorio; si inglés o portugués quedan vacíos, se muestra el texto en español en su lugar (no se copia, queda vacío de verdad).
        </p>
        <div className="flex flex-col gap-2">
          {closings.map(c => (
            <div key={c.id} className="rounded-xl p-3 flex items-start gap-3"
              style={{ background: 'rgba(96,165,250,0.04)', border: '1px solid rgba(96,165,250,0.15)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa' }}>{c.label_es}{(c.label_en || c.label_pt) && <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}> ({[c.label_en, c.label_pt].filter(Boolean).join(' / ')})</span>}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}><span style={{ color: 'rgba(255,255,255,0.3)' }}>es · </span>{c.phrase_es}</p>
                <p style={{ fontSize: 12, color: c.phrase_en ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)' }}><span style={{ color: 'rgba(255,255,255,0.3)' }}>en · </span>{c.phrase_en || '(usa español)'}</p>
                <p style={{ fontSize: 12, color: c.phrase_pt ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)' }}><span style={{ color: 'rgba(255,255,255,0.3)' }}>pt · </span>{c.phrase_pt || '(usa español)'}</p>
              </div>
              <button onClick={() => deleteClosing(c.id)} disabled={savingClosings}
                style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 8, color: '#f87171', fontSize: 12, padding: '4px 10px', cursor: 'pointer', flexShrink: 0 }}>
                Borrar
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 10 }}>
          <div className="flex items-center gap-2 flex-wrap">
            <input value={newClosingLabelEs} onChange={e => setNewClosingLabelEs(e.target.value)} placeholder="Nombre del chip - ES (ej: Con humor)"
              style={{ flex: '1 1 160px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '7px 11px', color: '#fff', fontSize: 12, outline: 'none' }} />
            <input value={newClosingLabelEn} onChange={e => setNewClosingLabelEn(e.target.value)} placeholder="Nombre - EN (opcional)"
              style={{ flex: '1 1 140px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '7px 11px', color: '#fff', fontSize: 12, outline: 'none' }} />
            <input value={newClosingLabelPt} onChange={e => setNewClosingLabelPt(e.target.value)} placeholder="Nombre - PT (opcional)"
              style={{ flex: '1 1 140px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '7px 11px', color: '#fff', fontSize: 12, outline: 'none' }} />
          </div>
          <input value={newClosingEs} onChange={e => setNewClosingEs(e.target.value)} placeholder="Frase en español"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '7px 11px', color: '#fff', fontSize: 12, outline: 'none' }} />
          <input value={newClosingEn} onChange={e => setNewClosingEn(e.target.value)} placeholder="Frase en inglés (opcional)"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '7px 11px', color: '#fff', fontSize: 12, outline: 'none' }} />
          <input value={newClosingPt} onChange={e => setNewClosingPt(e.target.value)} placeholder="Frase en portugués (opcional)"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '7px 11px', color: '#fff', fontSize: 12, outline: 'none' }} />
          <button onClick={addClosing} disabled={savingClosings || !newClosingLabelEs.trim() || !newClosingEs.trim()}
            className="text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50"
            style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.25)' }}>
            {savingClosings ? '...' : '+ Agregar'}
          </button>
        </div>
      </div>

      {/* Límite de mensajes de tatuadores por día — por si empiezan a subir muchas fotos */}
      <div className="flex items-center gap-2 flex-wrap">
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Máx. mensajes de tatuadores por día</span>
        <input type="number" min={0} value={artistLimitDraft} onChange={e => setArtistLimitDraft(e.target.value)}
          className="w-16 px-2 py-1 rounded-lg text-xs"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', outline: 'none' }} />
        <button onClick={saveArtistLimit} disabled={savingArtistLimit}
          className="text-xs font-bold px-2.5 py-1 rounded-lg disabled:opacity-50"
          style={{ background: 'rgba(239,255,66,0.1)', color: '#efff42', border: '1px solid rgba(239,255,66,0.25)' }}>
          {savingArtistLimit ? '...' : 'Guardar'}
        </button>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>0 = sin límite</span>
      </div>

      {/* Límite de mensajes de estudios por día */}
      <div className="flex items-center gap-2 flex-wrap">
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Máx. mensajes de estudios por día</span>
        <input type="number" min={0} value={studioLimitDraft} onChange={e => setStudioLimitDraft(e.target.value)}
          className="w-16 px-2 py-1 rounded-lg text-xs"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', outline: 'none' }} />
        <button onClick={saveStudioLimit} disabled={savingStudioLimit}
          className="text-xs font-bold px-2.5 py-1 rounded-lg disabled:opacity-50"
          style={{ background: 'rgba(239,255,66,0.1)', color: '#efff42', border: '1px solid rgba(239,255,66,0.25)' }}>
          {savingStudioLimit ? '...' : 'Guardar'}
        </button>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>0 = sin límite</span>
      </div>

      {/* Notificaciones push — estadística rápida */}
      {pushStats && (
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Notificaciones push
            </p>
            <button onClick={togglePushVisible} disabled={savingPushVisible}
              className="relative rounded-full transition-colors disabled:opacity-50"
              style={{ width: 32, height: 18, background: pushVisible ? '#efff42' : 'rgba(255,255,255,0.15)', flexShrink: 0 }}>
              <span className="absolute rounded-full bg-white transition-transform"
                style={{ width: 14, height: 14, top: 2, left: pushVisible ? 16 : 2 }} />
            </button>
            <span style={{ fontSize: 11, color: pushVisible ? '#efff42' : 'rgba(255,255,255,0.35)' }}>
              {pushVisible ? 'Visible para todos' : 'Oculto (solo pruebas)'}
            </span>
          </div>
          <div className="flex items-center gap-4 flex-wrap" style={{ marginBottom: pushStats.byCountry.length ? 10 : 0 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Total: <b style={{ color: '#fff' }}>{pushStats.total}</b></span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Sin país: <b style={{ color: '#fff' }}>{pushStats.withoutCountry}</b></span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Nunca confirmadas: <b style={{ color: '#fff' }}>{pushStats.neverConfirmed}</b></span>
          </div>
          {pushStats.byCountry.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pushStats.byCountry.map(([c, n]) => (
                <span key={c} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
                  {c}: <b style={{ color: '#fff' }}>{n}</b>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Clientes (no logueados) — para poder borrar pruebas sin tener que reportarlas primero */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(96,165,250,0.7)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Clientes ({clientPosts.length})</p>
          <button onClick={loadPosts} style={{ fontSize: 12, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 0 }}>↻ actualizar</button>
        </div>
        {loadingPosts ? null : clientPosts.length === 0
          ? <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Sin mensajes todavía.</p>
          : (
            <div className="flex flex-col gap-3" style={{ maxHeight: 480, overflowY: 'auto', paddingRight: 4 }}>
              {clientPosts.map(p => (
                <div key={p.id} className="rounded-xl p-4 flex gap-3"
                  style={{ background: 'rgba(96,165,250,0.04)', border: '1px solid rgba(96,165,250,0.15)' }}>
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{p.client_name ?? '—'}</span>
                      {(p.city || p.country) && (
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{[p.city, p.country].filter(Boolean).join(', ')}</span>
                      )}
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{timeAgoAdmin(p.created_at)}</span>
                    </div>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{p.content}</p>
                  </div>
                  <button onClick={() => deletePost(p.id)}
                    style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 8, color: '#f87171', fontSize: 12, padding: '4px 10px', cursor: 'pointer', alignSelf: 'flex-start', flexShrink: 0 }}>
                    Borrar
                  </button>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* Reportados */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,80,80,0.6)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Reportados ({reportedPosts.length})</p>
          <button onClick={loadPosts} style={{ fontSize: 12, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 0 }}>↻ actualizar</button>
        </div>
        {loadingPosts ? null : reportedPosts.length === 0
          ? <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Sin reportes.</p>
          : reportedPosts.map(p => (
            <div key={p.id} className="rounded-xl p-4 flex gap-3"
              style={{ background: 'rgba(255,80,80,0.04)', border: '1px solid rgba(255,80,80,0.15)' }}>
              <div style={{ flex: 1 }}>
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{postName(p)}</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{p.type} · {p.lang}</span>
                  {p.city && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{[p.city, p.country].filter(Boolean).join(', ')}</span>}
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#f87171', marginLeft: 'auto' }}>{p.report_count} reporte{(p.report_count ?? 0) > 1 ? 's' : ''}</span>
                </div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{p.content}</p>
              </div>
              <button onClick={() => deletePost(p.id)}
                style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 8, color: '#f87171', fontSize: 12, padding: '4px 10px', cursor: 'pointer', alignSelf: 'flex-start', flexShrink: 0 }}>
                Borrar
              </button>
            </div>
          ))}
      </div>

    </div>
  )
}

const iCls = 'w-full py-2 px-3 text-sm text-white outline-none rounded-lg'
  + ' bg-white/5 border border-white/10 focus:border-white/30 transition-colors placeholder-white/20'
