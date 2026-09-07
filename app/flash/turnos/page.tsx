'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/contexts/TranslationContext'

type Slot = { date: string; times: string[] }
type Session = { id: string; name: string; flashbook_alias: string | null; access_token: string; refresh_token?: string }

const TIMES = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2,'0')}:00`)
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAY_LABELS = ['L','M','X','J','V','S','D']

function pad(n: number) { return String(n).padStart(2, '0') }

export default function TurnosPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [session, setSession] = useState<Session | null | 'loading'>('loading')
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [viewMonth, setViewMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() } })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('flashttoo_artist_session')
      if (!raw) { setSession(null); return }
      const s: Session = JSON.parse(raw)
      setSession(s)
      fetch(`/api/flash/availability?artist_id=${s.id}`, { cache: 'no-store' })
        .then(r => r.json())
        .then(d => { if (Array.isArray(d.artist?.availability)) setSlots(d.artist.availability) })
        .catch(() => {})
    } catch { setSession(null) }
  }, [])

  // redirect if no session (in effect, not render)
  useEffect(() => {
    if (session === null) router.replace('/')
  }, [session, router])

  if (session === 'loading' || session === null) return (
    <div style={{ minHeight: '100dvh', background: '#090909', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 24, height: 24, border: '2px solid rgba(239,255,66,0.3)', borderTop: '2px solid #efff42', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const { year, month } = viewMonth
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date(); today.setHours(0,0,0,0)

  const cells: (number | null)[] = []
  for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const selectedSlot = selectedDay ? slots.find(s => s.date === selectedDay) : null
  const selectedTimes = selectedSlot?.times ?? []

  function toggleDay(dateStr: string) {
    const has = slots.find(s => s.date === dateStr)
    if (has) {
      setSlots(prev => prev.filter(s => s.date !== dateStr))
      if (selectedDay === dateStr) setSelectedDay(null)
    } else {
      setSlots(prev => [...prev, { date: dateStr, times: [] }])
      setSelectedDay(dateStr)
    }
  }

  function toggleTime(t: string) {
    if (!selectedDay) return
    setSlots(prev => prev.map(s => s.date === selectedDay
      ? { ...s, times: s.times.includes(t) ? s.times.filter(x => x !== t) : [...s.times, t].sort() }
      : s
    ))
  }

  async function save() {
    setSaving(true); setSaveError('')
    try {
      const r = await fetch('/api/flash/availability', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: session.access_token, artist_id: session.id, slots }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        setSaveError(d.error || `Error ${r.status}`)
      } else {
        const d = await r.json().catch(() => ({}))
        if (Array.isArray(d.availability)) setSlots(d.availability)
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } catch { setSaveError('Error de conexión') }
    setSaving(false)
  }

  function availSlug() {
    const n = (session.name || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '')
    return session.flashbook_alias ?? `turnoslibresy${n}-${session.id}`
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/disponibilidad/${availSlug()}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const availCount = slots.length

  return (
    <div style={{ minHeight: '100dvh', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}} * { box-sizing: border-box }`}</style>

      {/* Backdrop */}
      <div onClick={() => router.back()} style={{ position: 'fixed', inset: 0, zIndex: 0 }} />

      {/* Modal */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 440,
        background: '#111',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: '20px 20px 0 0',
        padding: '0 0 40px',
        animation: 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1)',
        maxHeight: '92dvh',
        overflowY: 'auto',
      }}>

        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 0' }}>
          <div>
            <p style={{ fontSize: 17, fontWeight: 800, color: '#f0f0ee', margin: 0 }}>{t('turnos_libres','titulo','Turnos libres')}</p>
            {availCount > 0
              ? <p style={{ fontSize: 11, color: 'rgba(239,255,66,0.6)', marginTop: 2 }}>{availCount} {availCount === 1 ? t('turnos_libres','dia_disponible','día disponible') : t('turnos_libres','dias_disponibles','días disponibles')}</p>
              : <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>{t('turnos_libres','sin_dias','Sin días marcados')}</p>
            }
          </div>
          <button onClick={() => router.back()}
            style={{ fontSize: 20, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, flexShrink: 0 }}>
            ×
          </button>
        </div>

        <div style={{ padding: '16px 20px 0' }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginBottom: 18, lineHeight: 1.5 }}>
            Marcá los días en amarillo. Los días en rojo aparecen como ocupados. Compartí el link para que tus clientes lo vean.
          </p>

          {/* Nav mes */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button type="button" onClick={() => setViewMonth(v => { const d = new Date(v.year, v.month - 1); return { year: d.getFullYear(), month: d.getMonth() } })}
              style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 18, cursor: 'pointer', padding: '6px 12px', borderRadius: 8, lineHeight: 1 }}>‹</button>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{MONTH_NAMES[month]} {year}</span>
            <button type="button" onClick={() => setViewMonth(v => { const d = new Date(v.year, v.month + 1); return { year: d.getFullYear(), month: d.getMonth() } })}
              style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 18, cursor: 'pointer', padding: '6px 12px', borderRadius: 8, lineHeight: 1 }}>›</button>
          </div>

          {/* Días semana */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 4 }}>
            {DAY_LABELS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em', padding: '3px 0' }}>{d}</div>
            ))}
          </div>

          {/* Grilla días */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 16 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} />
              const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`
              const dayDate = new Date(year, month, day)
              const isPast = dayDate < today
              const slot = slots.find(s => s.date === dateStr)
              const isSelected = selectedDay === dateStr
              const isAvail = !!slot
              return (
                <button key={i} type="button" disabled={isPast}
                  onClick={() => { setSelectedDay(isSelected ? null : dateStr); if (!isAvail) toggleDay(dateStr) }}
                  style={{
                    aspectRatio: '1', borderRadius: 9, fontSize: 12,
                    fontWeight: isAvail ? 800 : 400,
                    border: isSelected ? '2px solid #efff42' : `1px solid ${isAvail ? 'rgba(239,255,66,0.35)' : 'rgba(255,255,255,0.06)'}`,
                    background: isAvail ? 'rgba(239,255,66,0.13)' : 'rgba(255,30,30,0.08)',
                    color: isPast ? 'rgba(255,255,255,0.1)' : isAvail ? '#efff42' : 'rgba(255,255,255,0.28)',
                    cursor: isPast ? 'default' : 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                  }}>
                  {day}
                  {slot && slot.times.length > 0 && (
                    <span style={{ fontSize: 7, color: 'rgba(239,255,66,0.55)', lineHeight: 1 }}>·{slot.times.length}</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Editor horarios */}
          {selectedDay && slots.find(s => s.date === selectedDay) && (
            <div style={{ marginBottom: 16, padding: '14px', background: 'rgba(239,255,66,0.05)', border: '1px solid rgba(239,255,66,0.15)', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(239,255,66,0.8)' }}>
                  {selectedDay.split('-').reverse().slice(0,2).join('/')} — {t('turnos_libres','horarios','Horarios')}
                </p>
                <button type="button" onClick={() => toggleDay(selectedDay)}
                  style={{ fontSize: 10, color: 'rgba(255,80,80,0.7)', background: 'none', border: '1px solid rgba(255,80,80,0.25)', borderRadius: 6, padding: '3px 9px', cursor: 'pointer' }}>
                  {t('turnos_libres','quitar_dia','Quitar día')}
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {TIMES.map(hr => {
                  const on = selectedTimes.includes(hr)
                  return (
                    <button key={hr} type="button" onClick={() => toggleTime(hr)}
                      style={{ fontSize: 12, fontWeight: 700, padding: '6px 11px', borderRadius: 8, border: `1px solid ${on ? 'rgba(239,255,66,0.5)' : 'rgba(255,255,255,0.1)'}`, background: on ? 'rgba(239,255,66,0.15)' : 'rgba(255,255,255,0.04)', color: on ? '#efff42' : 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>
                      {hr}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {saveError && <p style={{ fontSize: 11, color: '#f87171', marginBottom: 8 }}>{saveError}</p>}

          {/* Acciones */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={copyLink}
              style={{ flex: 1, padding: '11px', background: copied ? 'rgba(100,220,100,0.1)' : 'rgba(255,255,255,0.06)', border: `1px solid ${copied ? 'rgba(100,220,100,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, fontSize: 12, fontWeight: 700, color: copied ? 'rgba(100,220,100,0.8)' : 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
              {copied ? t('turnos_libres','copiado','✓ Copiado') : t('turnos_libres','copiar_link','Copiar link')}
            </button>
            <button type="button" onClick={save} disabled={saving}
              style={{ flex: 2, padding: '11px', background: saved ? 'rgba(100,220,100,0.15)' : '#efff42', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 800, color: saved ? 'rgba(100,220,100,0.9)' : '#000', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? t('turnos_libres','guardando','Guardando…') : saved ? t('turnos_libres','guardado','✓ Guardado') : t('turnos_libres','guardar','Guardar')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
