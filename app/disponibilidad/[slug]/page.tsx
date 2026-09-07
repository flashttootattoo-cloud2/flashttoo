'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslation } from '@/contexts/TranslationContext'

type Slot = { date: string; times: string[] }
type Artist = { id: string; name: string; photo_url: string | null; flashbook_alias: string | null; availability: Slot[] }

const MONTH_KEYS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const MONTH_ES   = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAY_LABELS = ['L','M','X','J','V','S','D']

function pad(n: number) { return String(n).padStart(2, '0') }

export default function DisponibilidadPage() {
  const { slug } = useParams<{ slug: string }>()
  const { t } = useTranslation()
  const [artist, setArtist] = useState<Artist | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMonth, setViewMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() } })
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    fetch(`/api/flash/availability?slug=${slug}`)
      .then(r => r.json())
      .then(d => { if (d.artist) setArtist(d.artist) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: '#090909', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 24, height: 24, border: '2px solid rgba(239,255,66,0.3)', borderTop: '2px solid #efff42', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (!artist) return (
    <div style={{ minHeight: '100dvh', background: '#090909', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>{t('disponibilidad','artista_no_encontrado','Artista no encontrado')}</p>
    </div>
  )

  const { year, month } = viewMonth
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date(); today.setHours(0,0,0,0)
  const slots: Slot[] = artist.availability ?? []
  const selectedSlot = selectedDay ? slots.find(s => s.date === selectedDay) : null

  const cells: (number | null)[] = []
  for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div style={{ minHeight: '100dvh', background: '#090909', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } } * { box-sizing: border-box }`}</style>

      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Logoprincipal.svg" alt="Flashttoo" style={{ height: 28, marginBottom: 24, display: 'block' }} />

        {/* Card agenda */}
        <div style={{ position: 'relative', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '20px 18px', overflow: 'hidden' }}>

          {/* Fondo foto dentro del card */}
          {artist.photo_url && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={artist.photo_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 1 }} />
            </>
          )}
          {!artist.photo_url && <div style={{ position: 'absolute', inset: 0, background: '#111', zIndex: 0 }} />}

          <div style={{ position: 'relative', zIndex: 2 }}>

          {/* Nombre artista */}
          <p style={{ fontSize: 22, fontWeight: 800, color: '#f0f0ee', margin: '0 0 16px' }}>{artist.name}</p>

          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 16 }}>{t('disponibilidad','titulo','Turnos libres')}</p>

          {/* Leyenda */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(239,255,66,0.2)', border: '1px solid rgba(239,255,66,0.4)' }} />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{t('disponibilidad','disponible','Disponible')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(255,30,30,0.12)', border: '1px solid rgba(255,50,50,0.15)' }} />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{t('disponibilidad','ocupado','Ocupado')}</span>
            </div>
          </div>

          {/* Nav mes */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button type="button" onClick={() => setViewMonth(v => { const d = new Date(v.year, v.month - 1); return { year: d.getFullYear(), month: d.getMonth() } })}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 18, cursor: 'pointer', padding: '4px 8px', lineHeight: 1 }}>‹</button>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{t('meses', MONTH_KEYS[month], MONTH_ES[month])} {year}</span>
            <button type="button" onClick={() => setViewMonth(v => { const d = new Date(v.year, v.month + 1); return { year: d.getFullYear(), month: d.getMonth() } })}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 18, cursor: 'pointer', padding: '4px 8px', lineHeight: 1 }}>›</button>
          </div>

          {/* Días semana */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3 }}>
            {DAY_LABELS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em', padding: '3px 0' }}>{d}</div>
            ))}
          </div>

          {/* Grilla */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 16 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} />
              const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`
              const dayDate = new Date(year, month, day)
              const isPast = dayDate < today
              const slot = slots.find(s => s.date === dateStr)
              const isSelected = selectedDay === dateStr
              const isAvail = !!slot

              return (
                <button
                  key={i}
                  type="button"
                  disabled={isPast || !isAvail}
                  onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: isAvail ? 800 : 400,
                    border: isSelected ? '2px solid #efff42' : isAvail ? '1px solid rgba(239,255,66,0.45)' : 'none',
                    background: isAvail ? 'rgba(239,255,66,0.18)' : 'transparent',
                    color: isPast ? 'rgba(255,255,255,0.08)' : isAvail ? '#efff42' : 'rgba(255,60,60,0.7)',
                    cursor: isAvail && !isPast ? 'pointer' : 'default',
                  }}
                >
                  {day}
                  {slot && slot.times.length > 0 && (
                    <div style={{ fontSize: 7, color: 'rgba(239,255,66,0.5)', lineHeight: 1, marginTop: 1 }}>·{slot.times.length}</div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Horarios del día seleccionado */}
          {selectedSlot && (
            <div style={{ padding: '12px 14px', background: 'rgba(239,255,66,0.06)', border: '1px solid rgba(239,255,66,0.18)', borderRadius: 10, marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(239,255,66,0.8)', marginBottom: 10 }}>
                {selectedDay!.split('-').reverse().slice(0,2).join('/')} — {t('disponibilidad','horarios_disponibles','Horarios disponibles')}
              </p>
              {selectedSlot.times.length > 0
                ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selectedSlot.times.map(t => (
                      <span key={t} style={{ fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 8, background: 'rgba(239,255,66,0.15)', border: '1px solid rgba(239,255,66,0.3)', color: '#efff42' }}>{t}</span>
                    ))}
                  </div>
                )
                : <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{t('disponibilidad','consultar_horario','Consultar horario')}</p>
              }
            </div>
          )}

          {slots.length === 0 && (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '12px 0' }}>{t('disponibilidad','sin_turnos','Sin turnos cargados por ahora')}</p>
          )}

          {/* CTA contacto */}
          <a href={`/?artista=${artist.id}`}
            style={{ display: 'block', textAlign: 'center', padding: '12px', background: '#efff42', color: '#000', borderRadius: 10, fontSize: 13, fontWeight: 800, textDecoration: 'none', marginTop: 4 }}>
            {t('disponibilidad','ver_perfil','Ver perfil completo')}
          </a>

          </div>{/* /zIndex wrapper */}
        </div>

        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', textAlign: 'center', marginTop: 16 }}>flashttoo.com</p>
      </div>
    </div>
  )
}
