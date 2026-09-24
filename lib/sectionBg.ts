import type { CSSProperties } from 'react'

export type SectionBgKey = 'home' | 'gallery' | 'cultura' | 'events'
export type SectionBg = { url: string; dim: number; mode: 'cover' | 'tile'; bytes?: number }
export type SectionBgs = Partial<Record<SectionBgKey, SectionBg>>

export const SECTION_BG_KEYS: SectionBgKey[] = ['home', 'gallery', 'cultura', 'events']

export const DEFAULT_DIM = 0.85

// Imagen de fondo con una capa negra encima (dim = opacidad de esa capa) para que
// funcione como textura apenas perceptible y no compita con el contenido
export function sectionBgStyle(bg: SectionBg | undefined, base: string): CSSProperties {
  if (!bg?.url) return { background: base }
  const dim = Math.min(0.97, Math.max(0, bg.dim))
  const tile = bg.mode === 'tile'
  return {
    backgroundColor: base,
    backgroundImage: `linear-gradient(rgba(0,0,0,${dim}), rgba(0,0,0,${dim})), url("${bg.url}")`,
    backgroundSize: tile ? '100% 100%, auto' : '100% 100%, cover',
    backgroundRepeat: tile ? 'no-repeat, repeat' : 'no-repeat, no-repeat',
    backgroundPosition: 'center, center',
  }
}
