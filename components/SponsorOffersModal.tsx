'use client'
import { useState, useEffect } from 'react'
import { useTranslation } from '@/contexts/TranslationContext'

type Offer = { id: string; title: string; whatsapp: string; items: { name: string; price: number }[]; created_at: string }

type Props = {
  accessToken: string
  refreshToken?: string
  onTokenRefreshed?: (tokens: { access_token: string; refresh_token?: string }) => void
  onClose: () => void
}

const MAX_ITEMS = 6

export default function SponsorOffersModal({ accessToken, refreshToken, onTokenRefreshed, onClose }: Props) {
  const { t } = useTranslation()
  const [token, setToken] = useState(accessToken)
  const [loading, setLoading] = useState(true)
  const [offers, setOffers] = useState<Offer[]>([])
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [items, setItems] = useState<{ name: string; price: string }[]>([{ name: '', price: '' }])
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
      let r = await fetch(`/api/sponsor-offers?access_token=${encodeURIComponent(token)}`)
      if (r.status === 401) {
        const fresh = await refreshIfNeeded()
        if (fresh) r = await fetch(`/api/sponsor-offers?access_token=${encodeURIComponent(fresh)}`)
      }
      const d = await r.json()
      if (r.ok) setOffers(d.offers ?? [])
      else setError(d.error || 'Error al cargar')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const resetForm = () => { setTitle(''); setWhatsapp(''); setItems([{ name: '', price: '' }]); setShowForm(false) }

  const save = async () => {
    setSaving(true); setError('')
    try {
      const validItems = items
        .map(it => ({ name: it.name.trim(), price: parseFloat(it.price) }))
        .filter(it => it.name && Number.isFinite(it.price) && it.price > 0)
      const body = { access_token: token, title: title.trim(), whatsapp: whatsapp.trim(), items: validItems }
      let r = await fetch('/api/sponsor-offers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (r.status === 401) {
        const fresh = await refreshIfNeeded()
        if (fresh) r = await fetch('/api/sponsor-offers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, access_token: fresh }) })
      }
      const d = await r.json()
      if (!r.ok) { setError(d.error || 'Error'); return }
      resetForm()
      await load()
    } finally { setSaving(false) }
  }

  const remove = async (id: string) => {
    setDeletingId(id)
    try {
      let r = await fetch(`/api/sponsor-offers/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ access_token: token }) })
      if (r.status === 401) {
        const fresh = await refreshIfNeeded()
        if (fresh) r = await fetch(`/api/sponsor-offers/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ access_token: fresh }) })
      }
      if (r.ok) setOffers(prev => prev.filter(o => o.id !== id))
    } finally { setDeletingId(null) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}>
      <style>{`@keyframes slideUpModal{from{transform:translateY(28px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      <div onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 460, maxHeight: '85vh', display: 'flex', flexDirection: 'column', borderRadius: '20px 20px 0 0', boxShadow: '0 -24px 60px rgba(0,0,0,0.9)', animation: 'slideUpModal 0.38s cubic-bezier(0.22,0.61,0.36,1)', overflow: 'hidden', background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none' }}>

        <div style={{ padding: '18px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
            ⚡ {t('offers', 'title', 'Pedido Flash')}
          </p>
          <button onClick={onClose}
            style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ overflowY: 'auto', padding: '18px 20px 28px' }}>
          {loading ? (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '20px 0' }}>{t('offers', 'loading', 'Cargando...')}</p>
          ) : (
            <>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: 16, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                {t('offers', 'description', 'Armá ofertas con ítems y precios. Después, al publicar en la comunidad, elegís cuál adjuntar.')}
              </p>

              {error && <p style={{ fontSize: 12, color: 'rgba(255,100,100,0.8)', marginBottom: 12 }}>{error}</p>}

              {!showForm ? (
                <button onClick={() => setShowForm(true)}
                  className="font-bold px-4 py-2.5 rounded-full disabled:opacity-40"
                  style={{ fontSize: 12, color: '#000', background: '#efff42', marginBottom: 18 }}>
                  + {t('offers', 'new_btn', 'Nueva oferta')}
                </button>
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 14, marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input placeholder={t('offers', 'name_placeholder', 'Nombre de la oferta (ej: Promo agujas)')} value={title}
                    onChange={e => setTitle(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 10px', color: '#fff', fontSize: 13, outline: 'none' }} />
                  <input placeholder={t('offers', 'whatsapp_placeholder', 'WhatsApp para recibir estos pedidos (ej: 5491122334455)')} inputMode="tel" value={whatsapp}
                    onChange={e => setWhatsapp(e.target.value.replace(/[^0-9+]/g, ''))}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 10px', color: '#fff', fontSize: 13, outline: 'none' }} />
                  {items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input placeholder={t('offers', 'item_placeholder', 'Ítem')} value={item.name}
                        onChange={e => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, name: e.target.value } : it))}
                        style={{ flex: 1, minWidth: 0, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 12, outline: 'none' }} />
                      <input placeholder={t('offers', 'price_placeholder', 'Precio')} inputMode="decimal" value={item.price}
                        onChange={e => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, price: e.target.value.replace(/[^0-9.]/g, '') } : it))}
                        style={{ width: 80, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 12, outline: 'none' }} />
                      {items.length > 1 && (
                        <button type="button" onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}
                          style={{ background: 'none', border: 'none', color: 'rgba(255,100,100,0.6)', fontSize: 16, cursor: 'pointer', padding: '0 4px', flexShrink: 0 }}>×</button>
                      )}
                    </div>
                  ))}
                  {items.length < MAX_ITEMS && (
                    <button type="button" onClick={() => setItems(prev => [...prev, { name: '', price: '' }])}
                      style={{ alignSelf: 'flex-start', fontSize: 11, color: '#efff42', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}>
                      + {t('offers', 'add_item', 'Agregar ítem')}
                    </button>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button onClick={resetForm} className="text-xs px-3 py-2 rounded-full"
                      style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
                      {t('offers', 'cancel_btn', 'Cancelar')}
                    </button>
                    <button onClick={save} disabled={saving}
                      className="font-bold px-4 py-2 rounded-full disabled:opacity-40"
                      style={{ fontSize: 12, color: '#000', background: '#efff42' }}>
                      {saving ? t('offers', 'saving', 'Guardando...') : t('offers', 'save_btn', 'Guardar oferta')}
                    </button>
                  </div>
                </div>
              )}

              <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                {t('offers', 'your_offers', 'Tus ofertas guardadas')}
              </p>
              {offers.length === 0 ? (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', padding: '12px 0' }}>{t('offers', 'no_offers', 'Todavía no armaste ninguna oferta.')}</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {offers.map(offer => (
                    <div key={offer.id} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{offer.title}</span>
                        <button onClick={() => remove(offer.id)} disabled={deletingId === offer.id}
                          className="text-xs px-3 py-1.5 rounded-full shrink-0 disabled:opacity-40"
                          style={{ background: 'transparent', color: 'rgba(255,100,100,0.7)', border: '1px solid rgba(255,80,80,0.2)' }}>
                          {deletingId === offer.id ? '...' : t('offers', 'delete_btn', 'Borrar')}
                        </button>
                      </div>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                        {offer.items.map(it => it.name).join(' · ')}
                      </p>
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
