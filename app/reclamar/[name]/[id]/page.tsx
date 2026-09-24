'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

type ArtistPreview = {
  id: string
  name: string
  city: string | null
  country: string | null
  styles: string[]
  bio: string | null
  photo_url: string | null
  instagram: string | null
}

export default function ReclamarPerfil() {
  // El [name] en la URL es solo estético (para que el link se vea personalizado
  // al compartirlo) — la identidad real y la prueba de acceso siguen siendo el id
  const { id } = useParams<{ name: string; id: string }>()
  const [artist, setArtist] = useState<ArtistPreview | null>(null)
  const [claimed, setClaimed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [activating, setActivating] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [tyc, setTyc] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/artists/${id}/preview`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setNotFound(true); return }
        setArtist(d.artist)
        setClaimed(!!d.claimed)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  async function handleActivate() {
    if (!tyc) { setError('Tenés que aceptar los términos para continuar'); return }
    if (!email.trim() || !password) { setError('Completá email y contraseña'); return }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return }
    setSubmitting(true); setError('')

    const r = await fetch(`/api/artists/${id}/claim`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password, tyc }),
    }).then(res => res.json()).catch(() => ({ error: 'Error de red' }))

    if (r.error) { setError(r.error); setSubmitting(false); return }

    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: auth, error: authError } = await sb.auth.signInWithPassword({ email: email.trim(), password })
    if (authError || !auth.session || !artist) {
      setError('El perfil se activó pero no se pudo iniciar sesión — entrá manualmente desde la app')
      setSubmitting(false)
      return
    }

    const session = {
      id: artist.id,
      name: artist.name,
      photo_url: artist.photo_url ?? null,
      slug: undefined,
      city: artist.city ?? null,
      country: artist.country ?? null,
      access_token: auth.session.access_token,
      refresh_token: auth.session.refresh_token,
      flashbook_alias: null,
    }
    try { localStorage.setItem('flashttoo_artist_session', JSON.stringify(session)) } catch {}
    window.location.href = '/'
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#050505', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <style>{`* { box-sizing: border-box } @keyframes fadeIn { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } } @keyframes spin { to { transform:rotate(360deg) } }`}</style>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/Logoprincipal.svg" alt="Flashttoo" style={{ height: 26, marginBottom: 20, opacity: 0.9 }} />

      {!claimed && artist && (
        <div style={{ marginBottom: 16, padding: '4px 12px', borderRadius: 20, background: 'rgba(239,255,66,0.08)', border: '1px solid rgba(239,255,66,0.2)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(239,255,66,0.6)' }}>
          Vista previa
        </div>
      )}

      {loading ? (
        <div style={{ width: 24, height: 24, border: '2px solid rgba(255,255,255,0.1)', borderTop: '2px solid #efff42', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      ) : notFound || !artist ? (
        <div style={{ width: '100%', maxWidth: 340, textAlign: 'center' }}>
          <p style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Este link ya no está disponible</p>
          <a href="/" style={{ display: 'inline-block', marginTop: 12, padding: '12px 24px', borderRadius: 12, background: '#efff42', color: '#000', fontWeight: 800, fontSize: 13, textDecoration: 'none' }}>
            Ir a Flashttoo
          </a>
        </div>
      ) : claimed ? (
        <div style={{ width: '100%', maxWidth: 340, textAlign: 'center' }}>
          <p style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Este perfil ya fue activado</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
            Si sos vos, iniciá sesión desde la app con el mail y la contraseña que ya configuraste.
          </p>
          <a href="/" style={{ display: 'inline-block', padding: '12px 24px', borderRadius: 12, background: '#efff42', color: '#000', fontWeight: 800, fontSize: 13, textDecoration: 'none' }}>
            Ir a Flashttoo
          </a>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: 340, animation: 'fadeIn 0.45s ease' }}>
          {/* Misma estructura que el modal de perfil real de la app (app/page.tsx),
              para que se vean exactamente como van a quedar publicados */}
          <div style={{ background: '#111', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
            <div style={{ position: 'relative', width: '100%', paddingBottom: '115%' }}>
              {artist.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={artist.photo_url} alt={artist.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #111 0%, rgba(0,0,0,0.5) 50%, transparent 100%)' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 }}>
                <h2 style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1, color: '#fff', overflowWrap: 'break-word' }}>{artist.name}</h2>
                {(artist.city || artist.country) && (
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                    {[artist.city, artist.country].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>

            <div style={{ padding: '12px 20px 20px' }}>
              {artist.styles.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: artist.bio ? 16 : 0 }}>
                  {artist.styles.map(s => (
                    <span key={s} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 5, background: 'transparent', border: '1px solid rgba(239,255,66,0.3)', color: '#efff42' }}>{s}</span>
                  ))}
                </div>
              )}
              {artist.bio && (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>{artist.bio}</p>
              )}
            </div>
          </div>

          <p style={{ marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 1.6 }}>
            Así se ve tu perfil en Flashttoo. Activalo para que quede visible y puedas editarlo cuando quieras.
          </p>

          {!activating ? (
            <button onClick={() => setActivating(true)}
              style={{ width: '100%', marginTop: 14, padding: '13px', borderRadius: 12, background: '#efff42', color: '#000', fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer' }}>
              Activar mi perfil
            </button>
          ) : (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                type="email" placeholder="Tu email" value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 14, outline: 'none' }} />
              <input
                type="password" placeholder="Contraseña (mín. 8 caracteres)" value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleActivate()}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 14, outline: 'none' }} />
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={tyc} onChange={e => setTyc(e.target.checked)}
                  style={{ width: 16, height: 16, marginTop: 1, accentColor: '#efff42', flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                  Acepto los{' '}
                  <Link href="/terminos" target="_blank" onClick={e => e.stopPropagation()} style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'underline' }}>
                    Términos y condiciones
                  </Link>{' '}
                  y la{' '}
                  <Link href="/privacidad" target="_blank" onClick={e => e.stopPropagation()} style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'underline' }}>
                    Política de privacidad
                  </Link>
                </span>
              </label>
              {error && <p style={{ fontSize: 12, color: 'rgba(255,100,100,0.8)' }}>{error}</p>}
              <button onClick={handleActivate} disabled={submitting}
                style={{ width: '100%', padding: '13px', borderRadius: 12, background: submitting ? 'rgba(239,255,66,0.4)' : '#efff42', color: '#000', fontWeight: 800, fontSize: 14, border: 'none', cursor: submitting ? 'default' : 'pointer' }}>
                {submitting ? 'Activando...' : 'Confirmar y activar'}
              </button>
            </div>
          )}
        </div>
      )}

      <p style={{ marginTop: 24, fontSize: 11, color: 'rgba(255,255,255,0.15)', textAlign: 'center' }}>
        Esta es una vista previa · El contenido aún no está publicado
      </p>
    </div>
  )
}
