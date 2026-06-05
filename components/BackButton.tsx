'use client'

export default function BackButton() {
  return (
    <button
      onClick={() => window.history.back()}
      className="text-xs mb-8 inline-block transition-opacity hover:opacity-80"
      style={{ color: 'rgba(255,255,255,0.3)' }}>
      ← volver
    </button>
  )
}
