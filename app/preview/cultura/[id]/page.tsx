'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'

type CulturaVideo = {
  id: string
  video_url: string | null
  cover_image_url: string
  author_instagram: string
  author_flashttoo_slug: string | null
  instagram_video_url: string | null
  description: string | null
  tags: string[]
  active: boolean
  archived_at: string | null
}

export default function PreviewCulturaVideo() {
  const { id } = useParams<{ id: string }>()
  const [video, setVideo] = useState<CulturaVideo | null>(null)
  const [loading, setLoading] = useState(true)
  const [muted, setMuted]   = useState(true)
  const [playing, setPlaying] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    fetch(`/api/cultura-videos`)
      .then(r => r.json())
      .then(d => {
        const found = (d.videos ?? []).find((v: CulturaVideo) => v.id === id)
        setVideo(found ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  function togglePlay() {
    const v = videoRef.current; if (!v) return
    if (v.paused) { v.play(); setPlaying(true) } else { v.pause(); setPlaying(false) }
  }
  function toggleSound(e: React.MouseEvent) {
    e.stopPropagation()
    const v = videoRef.current; if (!v) return
    v.muted = !v.muted; setMuted(v.muted)
  }

  const ig = video ? (video.author_instagram.startsWith('@') ? video.author_instagram : `@${video.author_instagram}`) : ''

  return (
    <div style={{ minHeight: '100dvh', background: '#050505', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0 } @keyframes fadeIn { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }`}</style>

      {/* Badge preview */}
      <div style={{ marginBottom: 16, padding: '4px 12px', borderRadius: 20, background: 'rgba(239,255,66,0.08)', border: '1px solid rgba(239,255,66,0.2)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(239,255,66,0.6)' }}>
        Vista previa
      </div>

      {loading ? (
        <div style={{ width: 24, height: 24, border: '2px solid rgba(255,255,255,0.1)', borderTop: '2px solid #efff42', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}>
          <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
        </div>
      ) : !video ? (
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Video no encontrado</p>
      ) : (
        <div style={{ width: '100%', maxWidth: 340, borderRadius: 20, overflow: 'hidden', background: '#0a0a0a', boxShadow: '0 32px 80px rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.07)', animation: 'fadeIn 0.45s ease' }}>
          <div style={{ position: 'relative', aspectRatio: '9/16', background: '#000', cursor: 'pointer' }} onClick={togglePlay}>
            {video.video_url
              ? <video ref={videoRef} src={video.video_url} poster={video.cover_image_url} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              // eslint-disable-next-line @next/next/no-img-element
              : <img src={video.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            }

            {/* Pausa */}
            {!playing && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#fff', fontSize: 20, marginLeft: 3 }}>▶</span>
                </div>
              </div>
            )}

            {/* Tags */}
            {video.tags.length > 0 && (
              <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 5 }}>
                {video.tags.slice(0, 2).map(t => (
                  <span key={t} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 5, background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(239,255,66,0.3)', color: '#efff42' }}>{t}</span>
                ))}
              </div>
            )}

            {/* Sonido */}
            {video.video_url && (
              <button onClick={toggleSound} style={{ position: 'absolute', bottom: 12, right: 12, width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                {muted ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                  </svg>
                )}
              </button>
            )}
          </div>

          {/* Info */}
          <div style={{ padding: '14px 16px 18px' }}>
            <a href={`https://instagram.com/${ig.slice(1)}`} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 13, fontWeight: 700, color: '#efff42', textDecoration: 'none' }}>
              {ig}
            </a>
            {video.description && (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 5, lineHeight: 1.5 }}>{video.description}</p>
            )}
            {!video.video_url && video.instagram_video_url && (
              <a href={video.instagram_video_url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '7px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
                Ver video en Instagram
              </a>
            )}
          </div>
        </div>
      )}

      <p style={{ marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,0.15)', textAlign: 'center' }}>
        Esta es una vista previa · El contenido aún no está publicado
      </p>
    </div>
  )
}
