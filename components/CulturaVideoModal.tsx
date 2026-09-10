'use client'
import { useEffect, useRef, useState } from 'react'

type CulturaVideo = {
  id: string
  video_url: string | null
  cover_image_url: string
  author_instagram: string
  author_flashttoo_slug: string | null
  description: string | null
  description_en: string | null
  description_pt: string | null
  tags: string[]
  tags_en: string[]
  tags_pt: string[]
  mute_audio: boolean
  published_at: string | null
}

export default function CulturaVideoModal() {
  const [visible, setVisible]   = useState(false)
  const [video, setVideo]       = useState<CulturaVideo | null>(null)
  const [muted, setMuted]       = useState(true)
  const [playing, setPlaying]   = useState(true)
  const videoRef                = useRef<HTMLVideoElement>(null)
  const historyPushedRef        = useRef(false)

  useEffect(() => {
    try { if (sessionStorage.getItem('cultura_video_closed')) return } catch {}
    fetch(`/api/cultura-videos`)
      .then(r => r.json())
      .then(d => {
        const videos: CulturaVideo[] = d?.videos ?? []
        if (!videos.length) return
        const recent = videos[0]
        if (!recent.published_at) return
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
        if (new Date(recent.published_at).getTime() < sevenDaysAgo) return
        setVideo(recent)
        setVisible(true)
      })
      .catch(() => {})
  }, [])

  // Empujar historial cuando el modal se abre
  useEffect(() => {
    if (visible) {
      history.pushState({ culturaModal: true }, '')
      historyPushedRef.current = true
    }
  }, [visible])

  // Capturar botón atrás del celular
  useEffect(() => {
    function onPop() {
      if (historyPushedRef.current) {
        historyPushedRef.current = false
        setVisible(false)
        try { sessionStorage.setItem('cultura_video_closed', '1') } catch {}
        if (videoRef.current) videoRef.current.pause()
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  function dismiss() {
    setVisible(false)
    try { sessionStorage.setItem('cultura_video_closed', '1') } catch {}
    if (videoRef.current) videoRef.current.pause()
    if (historyPushedRef.current) {
      historyPushedRef.current = false
      history.back()
    }
  }

  function toggleSound(e: React.MouseEvent) {
    e.stopPropagation()
    setMuted(v => !v)
    if (videoRef.current) videoRef.current.muted = !videoRef.current.muted
  }

  function togglePlay(e: React.MouseEvent) {
    e.stopPropagation()
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setPlaying(true) }
    else          { v.pause(); setPlaying(false) }
  }

  if (!visible || !video) return null

  const lang = typeof navigator !== 'undefined' ? navigator.language?.slice(0, 2) : 'es'
  const displayDesc = (lang === 'en' && video.description_en) ? video.description_en : (lang === 'pt' && video.description_pt) ? video.description_pt : video.description
  const displayTags = (lang === 'en' && video.tags_en?.length) ? video.tags_en : (lang === 'pt' && video.tags_pt?.length) ? video.tags_pt : video.tags

  const ig = video.author_instagram.startsWith('@') ? video.author_instagram : `@${video.author_instagram}`

  return (
    <div
      onClick={dismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 70,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <style>{`
        @keyframes cvIn { from { opacity:0; transform:scale(0.93) translateY(16px) } to { opacity:1; transform:scale(1) translateY(0) } }
      `}</style>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 340,
          borderRadius: 20,
          overflow: 'hidden',
          background: '#0a0a0a',
          animation: 'cvIn 0.55s cubic-bezier(0.22,0.61,0.36,1)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.9)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {/* Video o portada */}
        <div style={{ position: 'relative', aspectRatio: '9/16', background: '#000', cursor: video.video_url ? 'pointer' : 'default' }} onClick={video.video_url ? togglePlay : undefined}>
          {video.video_url
            ? <video ref={videoRef} src={video.video_url} poster={video.cover_image_url} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            // eslint-disable-next-line @next/next/no-img-element
            : <img src={video.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          }

          {/* Pausa overlay — solo si hay video */}
          {video.video_url && !playing && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontSize: 20, marginLeft: 3 }}>▶</span>
              </div>
            </div>
          )}

          {/* Botón sonido — solo si hay video */}
          {video.video_url && !video.mute_audio && (
            <button onClick={toggleSound} style={{ position: 'absolute', bottom: 12, right: 12, width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title={muted ? 'Activar sonido' : 'Silenciar'}>
              {muted
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
              }
            </button>
          )}

          {/* Tags */}
          {displayTags.length > 0 && (
            <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 5 }}>
              {displayTags.slice(0, 2).map(t => (
                <span key={t} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 5, background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(239,255,66,0.3)', color: '#efff42' }}>{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: '14px 16px 18px' }}>
          {video.author_flashttoo_slug
            ? <button onClick={e => { e.stopPropagation(); dismiss(); window.dispatchEvent(new CustomEvent('open-artist', { detail: video.author_flashttoo_slug })) }} style={{ fontSize: 13, fontWeight: 700, color: '#efff42', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>{ig}</button>
            : <a href={`https://instagram.com/${ig.slice(1)}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 13, fontWeight: 700, color: '#efff42', textDecoration: 'none' }}>{ig}</a>
          }
          {displayDesc && (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 5, lineHeight: 1.5, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
              {displayDesc.split(/(@[\w.]+)/g).map((part, i) =>
                /^@[\w.]+$/.test(part)
                  ? <a key={i} href={`https://instagram.com/${part.slice(1)}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: '#efff42', textDecoration: 'none', fontWeight: 600 }}>{part}</a>
                  : part
              )}
            </p>
          )}
        </div>

        {/* Cerrar */}
        <button
          onClick={dismiss}
          style={{
            position: 'absolute', top: 10, right: 10,
            width: 30, height: 30, borderRadius: '50%',
            background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.8)', fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >✕</button>
      </div>
    </div>
  )
}
