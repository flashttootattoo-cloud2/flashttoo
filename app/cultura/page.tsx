'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

type CulturaVideo = {
  id: string
  video_url: string | null
  cover_image_url: string
  author_instagram: string
  description: string | null
  tags: string[]
  published_at: string | null
  archived_at: string | null
  active: boolean
}

function VideoCard({ v }: { v: CulturaVideo }) {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const [muted,   setMuted]   = useState(true)
  const [playing, setPlaying] = useState(true)

  const ig = v.author_instagram.startsWith('@') ? v.author_instagram : `@${v.author_instagram}`

  function toggleSound(e: React.MouseEvent) {
    e.stopPropagation()
    const el = videoRef.current
    if (!el) return
    el.muted = !el.muted
    setMuted(el.muted)
  }

  function togglePlay() {
    const el = videoRef.current
    if (!el) return
    if (el.paused) { el.play(); setPlaying(true) }
    else           { el.pause(); setPlaying(false) }
  }

  return (
    <div style={{ flexShrink: 0, width: 220, borderRadius: 16, overflow: 'hidden', background: '#111', border: '1px solid rgba(255,255,255,0.07)', position: 'relative' }}>
      {/* Video */}
      <div style={{ position: 'relative', aspectRatio: '9/16', cursor: 'pointer' }} onClick={togglePlay}>
        {v.video_url
          ? <video ref={videoRef} src={v.video_url} poster={v.cover_image_url} autoPlay loop muted playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : /* eslint-disable-next-line @next/next/no-img-element */
            <img src={v.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        }

        {/* Pausa */}
        {!playing && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 16, marginLeft: 3 }}>▶</span>
            </div>
          </div>
        )}

        {/* Tags */}
        {v.tags.length > 0 && (
          <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {v.tags.slice(0, 2).map(t => (
              <span key={t} style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 7px', borderRadius: 4, background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(239,255,66,0.35)', color: '#efff42' }}>{t}</span>
            ))}
          </div>
        )}

        {/* Sonido */}
        {v.video_url && (
          <button onClick={toggleSound} style={{ position: 'absolute', bottom: 10, right: 10, width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            {muted ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '10px 12px 14px' }}>
        <a href={`https://instagram.com/${ig.slice(1)}`} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 12, fontWeight: 700, color: '#efff42', textDecoration: 'none' }}>{ig}</a>
        {v.description && (
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {v.description}
          </p>
        )}
      </div>
    </div>
  )
}

function ArchiveCard({ v }: { v: CulturaVideo }) {
  const [open, setOpen] = useState(false)
  const ig = v.author_instagram.startsWith('@') ? v.author_instagram : `@${v.author_instagram}`

  return (
    <>
      <div onClick={() => setOpen(true)} style={{ borderRadius: 12, overflow: 'hidden', background: '#111', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', position: 'relative' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={v.cover_image_url} alt="" style={{ width: '100%', aspectRatio: '9/16', objectFit: 'cover', display: 'block' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)' }} />
        <div style={{ position: 'absolute', bottom: 8, left: 10, right: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#efff42' }}>{ig}</p>
        </div>
        {v.tags.length > 0 && (
          <div style={{ position: 'absolute', top: 8, left: 8 }}>
            <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4, background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(239,255,66,0.3)', color: '#efff42' }}>{v.tags[0]}</span>
          </div>
        )}
      </div>

      {/* Detail overlay */}
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 320, borderRadius: 18, overflow: 'hidden', background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={v.cover_image_url} alt="" style={{ width: '100%', aspectRatio: '9/16', objectFit: 'cover', display: 'block', maxHeight: '55vh' }} />
            <div style={{ padding: '14px 16px 18px' }}>
              <a href={`https://instagram.com/${ig.slice(1)}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                style={{ fontSize: 13, fontWeight: 700, color: '#efff42', textDecoration: 'none' }}>{ig}</a>
              {v.description && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 6, lineHeight: 1.55 }}>{v.description}</p>}
            </div>
            <button onClick={() => setOpen(false)} style={{ position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
          </div>
        </div>
      )}
    </>
  )
}

const ALL_TAG = '__all__'

export default function CulturaPage() {
  const [videos,   setVideos]   = useState<CulturaVideo[]>([])
  const [loading,  setLoading]  = useState(true)
  const [activeTag, setActiveTag] = useState(ALL_TAG)

  useEffect(() => {
    fetch('/api/cultura-videos')
      .then(r => r.json())
      .then(d => setVideos(d.videos ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const active   = videos.filter(v => v.active && !v.archived_at)
  const archived = videos.filter(v => !!v.archived_at)

  // Todos los tags únicos
  const allTags = Array.from(new Set(videos.flatMap(v => v.tags))).sort()

  const filteredArchived = activeTag === ALL_TAG
    ? archived
    : archived.filter(v => v.tags.includes(activeTag))

  return (
    <div style={{ minHeight: '100dvh', background: '#090909', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <style>{`* { box-sizing: border-box }`}</style>

      {/* Nav */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 20px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52 }}>
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Logoprincipal.svg" alt="Flashttoo" style={{ height: 22 }} />
          </Link>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#efff42', background: 'rgba(239,255,66,0.08)', border: '1px solid rgba(239,255,66,0.2)', padding: '4px 10px', borderRadius: 6 }}>
            Cultura
          </span>
        </div>
      </div>

      {/* Tags filter */}
      {allTags.length > 0 && (
        <div style={{ overflowX: 'auto', padding: '14px 20px 0', display: 'flex', gap: 8 }}>
          <button onClick={() => setActiveTag(ALL_TAG)}
            style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 20, border: `1px solid ${activeTag === ALL_TAG ? '#efff42' : 'rgba(255,255,255,0.1)'}`, background: activeTag === ALL_TAG ? 'rgba(239,255,66,0.12)' : 'transparent', color: activeTag === ALL_TAG ? '#efff42' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
            Todo
          </button>
          {allTags.map(t => (
            <button key={t} onClick={() => setActiveTag(t)}
              style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 20, border: `1px solid ${activeTag === t ? '#efff42' : 'rgba(255,255,255,0.1)'}`, background: activeTag === t ? 'rgba(239,255,66,0.12)' : 'transparent', color: activeTag === t ? '#efff42' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
              {t}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
          <div style={{ width: 24, height: 24, border: '2px solid rgba(239,255,66,0.3)', borderTop: '2px solid #efff42', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : (
        <>
          {/* Carrusel videos activos */}
          {active.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', padding: '0 20px', marginBottom: 12 }}>Ahora</p>
              <div style={{ overflowX: 'auto', display: 'flex', gap: 12, padding: '0 20px 4px' }}>
                {active.map(v => <VideoCard key={v.id} v={v} />)}
              </div>
            </div>
          )}

          {/* Grid archivados */}
          {filteredArchived.length > 0 && (
            <div style={{ padding: '28px 20px 60px', maxWidth: 680, margin: '0 auto' }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 14 }}>Archivo</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {filteredArchived.map(v => <ArchiveCard key={v.id} v={v} />)}
              </div>
            </div>
          )}

          {active.length === 0 && filteredArchived.length === 0 && (
            <p style={{ textAlign: 'center', paddingTop: 80, fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>Sin contenido aún</p>
          )}
        </>
      )}
    </div>
  )
}
