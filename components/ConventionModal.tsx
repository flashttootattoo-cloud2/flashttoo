'use client'

import { useEffect, useRef, useState } from 'react'

type Convention = { id: string; name: string | null; image_url: string; link: string | null }

export default function ConventionModal({ conventions }: { conventions: Convention[] }) {
  const [visible, setVisible] = useState(false)
  const conv = useRef<Convention | null>(null)

  useEffect(() => {
    if (!conventions.length) return
    try { if (sessionStorage.getItem('conv_closed')) return } catch {}
    conv.current = conventions[Math.floor(Math.random() * conventions.length)]
    setVisible(true)
  }, [conventions])

  const dismiss = () => {
    setVisible(false)
    try { sessionStorage.setItem('conv_closed', '1') } catch {}
  }

  if (!visible || !conv.current) return null
  const c = conv.current

  return (
    <div
      onClick={dismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 70,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}>
      <style>{`@keyframes convIn { from { opacity:0; transform:scale(0.94) translateY(10px) } to { opacity:1; transform:scale(1) translateY(0) } }`}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%', maxWidth: 400,
          borderRadius: 20, overflow: 'hidden',
          background: '#111',
          animation: 'convIn 0.25s ease',
          boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
        }}>
        {/* Flyer — completo, sin corte */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={c.image_url} alt={c.name || 'Convención'}
          style={{
            display: 'block', width: '100%',
            maxHeight: '65vh',
            objectFit: 'contain',
            background: '#000',
          }} />

        {/* Acciones */}
        <div style={{ padding: '16px 18px 20px' }}>
          {c.name && (
            <p style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: '0 0 14px', lineHeight: 1.25 }}>
              {c.name}
            </p>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            {c.link && (
              <a href={c.link} target="_blank" rel="noopener noreferrer" onClick={dismiss}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '12px 18px', background: '#efff42', color: '#000',
                  borderRadius: 12, fontSize: 14, fontWeight: 800, textDecoration: 'none',
                }}>
                Ver más →
              </a>
            )}
            <button onClick={dismiss} style={{
              flex: c.link ? '0 0 auto' : 1,
              padding: '12px 20px',
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>
              Cerrar
            </button>
          </div>
        </div>

        {/* X arriba derecha */}
        <button onClick={dismiss} style={{
          position: 'absolute', top: 10, right: 10,
          width: 30, height: 30, borderRadius: '50%',
          background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.15)',
          color: 'rgba(255,255,255,0.8)', fontSize: 13,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>✕</button>
      </div>
    </div>
  )
}
