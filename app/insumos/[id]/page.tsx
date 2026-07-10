'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type Bucket = { detail_open: number; banner_click: number; detail_click: number }
type Sponsor = {
  id: string; name: string; logo_url: string; keep_color: boolean
  logo_scale: number | null; clicks: number; expires_at: string | null
  starts_at: string; description: string | null; country: string | null; city: string | null
}

const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function monthLabel(key: string) {
  const [y, m] = key.split('-')
  return `${MONTHS_ES[parseInt(m) - 1]} ${y}`
}

export default function InsumosStatsPage() {
  const { id } = useParams<{ id: string }>()
  const [sponsor, setSponsor] = useState<Sponsor | null>(null)
  const [totals, setTotals] = useState<Bucket | null>(null)
  const [monthly, setMonthly] = useState<Record<string, Bucket>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/insumos/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setSponsor(d.sponsor)
        setTotals(d.totals)
        setMonthly(d.monthly)
      })
      .catch(() => setError('Error al cargar'))
      .finally(() => setLoading(false))
  }, [id])

  const now = new Date()
  const exp = sponsor?.expires_at ? new Date(sponsor.expires_at) : null
  const daysLeft = exp ? Math.ceil((exp.getTime() - now.getTime()) / 86400000) : null
  const expired = daysLeft !== null && daysLeft < 0

  const maxVal = Math.max(...Object.values(monthly).map(b => b.detail_open + b.banner_click + b.detail_click), 1)

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: '#0d0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#efff42', animation: 'pulse 1s ease-in-out infinite' }} />
    </div>
  )

  if (error || !sponsor) return (
    <div style={{ minHeight: '100dvh', background: '#0d0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No encontrado</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: '#0d0d0d', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:.3} 50%{opacity:1} }
      `}</style>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <div style={{
            width: 72, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: sponsor.keep_color ? '#fff' : 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0,
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sponsor.logo_url} alt={sponsor.name} style={{
              maxHeight: 28, maxWidth: 60, objectFit: 'contain',
              filter: sponsor.keep_color ? 'none' : 'brightness(0) invert(1)',
            }} />
          </div>
          <div>
            <p style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{sponsor.name}</p>
            {(sponsor.country || sponsor.city) && (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>
                {[sponsor.city, sponsor.country].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* Vencimiento */}
        <div style={{
          padding: '16px 20px', borderRadius: 14, marginBottom: 24,
          background: expired ? 'rgba(248,113,113,0.07)' : daysLeft !== null && daysLeft <= 7 ? 'rgba(251,146,60,0.07)' : 'rgba(239,255,66,0.05)',
          border: `1px solid ${expired ? 'rgba(248,113,113,0.2)' : daysLeft !== null && daysLeft <= 7 ? 'rgba(251,146,60,0.2)' : 'rgba(239,255,66,0.12)'}`,
        }}>
          {daysLeft === null ? (
            <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Sin fecha de vencimiento</p>
          ) : expired ? (
            <>
              <p style={{ margin: '0 0 2px', fontSize: 12, color: '#f87171', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Vencido</p>
              <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Venció hace {Math.abs(daysLeft)} días</p>
            </>
          ) : (
            <>
              <p style={{ margin: '0 0 2px', fontSize: 12, color: '#efff42', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Activo</p>
              <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
                {daysLeft === 0 ? 'Vence hoy' : `Quedan ${daysLeft} días — vence el ${exp!.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}`}
              </p>
            </>
          )}
        </div>

        {/* Stats totales */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 32 }}>
          {[
            { label: 'Vistas del logo', value: totals?.detail_open ?? 0 },
            { label: 'Clics en banner', value: totals?.banner_click ?? 0 },
            { label: 'Clics en detalle', value: totals?.detail_click ?? 0 },
          ].map(({ label, value }) => (
            <div key={label} style={{
              padding: '14px 12px', borderRadius: 12, textAlign: 'center',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
            }}>
              <p style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px', color: '#efff42' }}>{value}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: 0, lineHeight: 1.3 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Gráfico mensual */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
            Actividad mensual
          </p>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 80 }}>
            {Object.entries(monthly).map(([key, b]) => {
              const total = b.detail_open + b.banner_click + b.detail_click
              const h = Math.round((total / maxVal) * 80)
              return (
                <div key={key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: '100%', height: h || 3, borderRadius: 4,
                    background: h ? '#efff42' : 'rgba(255,255,255,0.08)',
                  }} />
                  <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', margin: 0, whiteSpace: 'nowrap' }}>
                    {monthLabel(key)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        <p style={{ marginTop: 48, fontSize: 11, color: 'rgba(255,255,255,0.12)', textAlign: 'center' }}>
          flashttoo.com · estadísticas de tu espacio
        </p>
      </div>
    </div>
  )
}
