'use client'
import { useState, useEffect } from 'react'
import { useTranslation } from '@/contexts/TranslationContext'

type Invite = { id: string; url: string; used: boolean; used_by_name: string | null; created_at: string }

type Props = {
  accessToken: string
  refreshToken?: string
  onTokenRefreshed?: (tokens: { access_token: string; refresh_token?: string }) => void
  onClose: () => void
}

export default function InvitesModal({ accessToken, refreshToken, onTokenRefreshed, onClose }: Props) {
  const { t } = useTranslation()
  const [token, setToken] = useState(accessToken)
  const [loading, setLoading] = useState(true)
  const [starterRemaining, setStarterRemaining] = useState(0)
  const [monthlyAvailable, setMonthlyAvailable] = useState(false)
  const [invitesDisabled, setInvitesDisabled] = useState(false)
  const [invites, setInvites] = useState<Invite[]>([])
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const refreshIfNeeded = async (): Promise<string | null> => {
    if (!refreshToken) return null
    const r = await fetch('/api/auth/refresh', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    if (!r.ok) return null
    const tokens = await r.json()
    setToken(tokens.access_token)
    onTokenRefreshed?.(tokens)
    return tokens.access_token as string
  }

  const load = async () => {
    setLoading(true)
    try {
      let r = await fetch(`/api/artist-invites?access_token=${encodeURIComponent(token)}`)
      if (r.status === 401) {
        const fresh = await refreshIfNeeded()
        if (fresh) r = await fetch(`/api/artist-invites?access_token=${encodeURIComponent(fresh)}`)
      }
      const d = await r.json()
      if (r.ok) {
        setStarterRemaining(d.starter_remaining)
        setMonthlyAvailable(d.monthly_available)
        setInvitesDisabled(!!d.invites_disabled)
        setInvites(d.invites ?? [])
      } else {
        setError(d.error || 'Error al cargar')
      }
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const available = starterRemaining + (monthlyAvailable ? 1 : 0)

  const copy = async (url: string, id: string) => {
    await navigator.clipboard.writeText(url).catch(() => {})
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const generate = async () => {
    setGenerating(true); setError('')
    try {
      let r = await fetch('/api/artist-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: token }),
      })
      if (r.status === 401) {
        const fresh = await refreshIfNeeded()
        if (fresh) {
          r = await fetch('/api/artist-invites', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token: fresh }),
          })
        }
      }
      const d = await r.json()
      if (!r.ok) { setError(d.error || 'Error'); return }
      await navigator.clipboard.writeText(d.url).catch(() => {})
      await load()
    } finally { setGenerating(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}>
      <style>{`@keyframes slideUpModal{from{transform:translateY(28px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      <div onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 460, maxHeight: '85vh', display: 'flex', flexDirection: 'column', borderRadius: '20px 20px 0 0', boxShadow: '0 -24px 60px rgba(0,0,0,0.9)', animation: 'slideUpModal 0.38s cubic-bezier(0.22,0.61,0.36,1)', overflow: 'hidden', background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none' }}>

        <div style={{ padding: '18px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
            {t('invites', 'title', 'Regalar pase a Flashttoo')}
          </p>
          <button onClick={onClose}
            style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ overflowY: 'auto', padding: '18px 20px 28px' }}>
          {loading ? (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '20px 0' }}>{t('invites', 'loading', 'Cargando...')}</p>
          ) : (
            <>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: 16, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                {t('invites', 'description', 'El registro en Flashttoo es solo por invitación. Generá un link y mandaselo a otro tatuador para que pueda crear su perfil.')}
              </p>

              {invitesDisabled ? (
                <div style={{ background: 'rgba(255,100,100,0.06)', border: '1px solid rgba(255,100,100,0.2)', borderRadius: 14, padding: '14px 16px', marginBottom: 18 }}>
                  <p style={{ fontSize: 12, color: 'rgba(255,150,150,0.85)', margin: 0, lineHeight: 1.5 }}>
                    {t('invites', 'disabled_note', 'Tenés las invitaciones desactivadas por el equipo de Flashttoo.')}
                  </p>
                </div>
              ) : (
                <div style={{ background: 'rgba(239,255,66,0.06)', border: '1px solid rgba(239,255,66,0.15)', borderRadius: 14, padding: '14px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 20, fontWeight: 800, color: '#efff42', margin: 0 }}>{available}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                      {t('invites', 'available', 'pases disponibles')}{monthlyAvailable ? ` · ${t('invites', 'monthly_note', '+1 este mes')}` : ''}
                    </p>
                  </div>
                  <button onClick={generate} disabled={generating || available <= 0}
                    className="font-bold px-3 py-1.5 rounded-full disabled:opacity-40 shrink-0"
                    style={{ fontSize: 11, color: '#000', background: '#38bdf8', letterSpacing: '0.04em' }}>
                    {generating ? t('invites', 'generating', 'Generando...') : t('invites', 'generate_btn', 'Generar y copiar link')}
                  </button>
                </div>
              )}

              {error && <p style={{ fontSize: 12, color: 'rgba(255,100,100,0.8)', marginBottom: 12 }}>{error}</p>}

              <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                {t('invites', 'your_invites', 'Tus invitados')}
              </p>
              {invites.length === 0 ? (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', padding: '12px 0' }}>{t('invites', 'no_invites', 'Todavía no generaste ninguna invitación.')}</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {invites.map(inv => (
                    <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                      {inv.used ? (
                        <span style={{ fontSize: 13, color: '#4ade80', fontWeight: 600 }}>✓ {inv.used_by_name || t('invites', 'someone', 'Alguien ya se registró')}</span>
                      ) : (
                        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{t('invites', 'pending', 'Todavía no lo usó nadie')}</span>
                      )}
                      {!inv.used && (
                        <button onClick={() => copy(inv.url, inv.id)}
                          className="text-xs font-bold px-3 py-1.5 rounded-full shrink-0"
                          style={{ background: copiedId === inv.id ? 'rgba(74,222,128,0.15)' : 'rgba(239,255,66,0.1)', color: copiedId === inv.id ? '#4ade80' : '#efff42', border: '1px solid rgba(239,255,66,0.25)' }}>
                          {copiedId === inv.id ? t('invites', 'copied', '¡Copiado!') : t('invites', 'copy_link', 'Copiar link')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
