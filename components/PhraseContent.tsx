import React from 'react'

function renderInline(line: string): React.ReactNode {
  const parts = line.split(/(\*\*[^*]+\*\*|==.+?==|@[\w.]+)/g)
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**') && p.length > 4)
          return <strong key={i} style={{ color: '#fff', fontWeight: 700 }}>{p.slice(2, -2)}</strong>
        if (p.startsWith('==') && p.endsWith('==') && p.length > 4)
          return <span key={i} style={{ color: '#efff42', fontWeight: 600 }}>{p.slice(2, -2)}</span>
        if (p.startsWith('@') && p.length > 1)
          return <a key={i} href={`https://instagram.com/${p.slice(1)}`} target="_blank" rel="noopener noreferrer" style={{ color: '#efff42', fontWeight: 600, textDecoration: 'none' }}>{p}</a>
        return p
      })}
    </>
  )
}

export function renderPhraseContent(text: string): React.ReactNode {
  return (
    <>
      {text.split('\n').map((line, i) => {
        if (line.startsWith('# '))
          return <p key={i} style={{ fontSize: 18, fontWeight: 800, color: '#f4f4f5', margin: '12px 0 4px', lineHeight: 1.3, letterSpacing: '-0.01em' }}>{line.slice(2)}</p>
        if (line.startsWith('## '))
          return <p key={i} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', margin: '14px 0 4px', letterSpacing: '0.14em', textTransform: 'uppercase' }}>{line.slice(3)}</p>
        if (line.startsWith('> '))
          return (
            <p key={i} style={{ fontSize: 15, fontStyle: 'italic', fontWeight: 600, color: '#f4f4f5', borderLeft: '3px solid #efff42', paddingLeft: 14, margin: '14px 0', lineHeight: 1.55 }}>
              {renderInline(line.slice(2))}
            </p>
          )
        if (line.trim() === '---')
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '20px 0' }}>
              <div style={{ width: 36, height: 2, background: '#efff42', borderRadius: 2 }} />
            </div>
          )
        if (!line.trim())
          return <div key={i} style={{ height: 10 }} />
        const imgMatch = line.match(/^\[img:(https?:\/\/[^\]|]+)(?:\|(\w+))?\]$/)
        if (imgMatch) {
          const small = imgMatch[2] === 'small'
          return <img key={i} src={imgMatch[1]} alt="" style={small
            ? { width: '60%', display: 'block', margin: '8px auto', borderRadius: 6 }
            : { width: '100%', display: 'block', margin: '6px 0', borderRadius: 6 }} />
        }
        const linkMatch = line.match(/^\[link:(https?:\/\/[^\]|]+)(?:\|([^\]]+))?\]$/)
        if (linkMatch) {
          const href = linkMatch[1]
          const label = linkMatch[2]?.trim() || 'Ver publicación original'
          return (
            <a key={i} href={href} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: '10px 0', padding: '9px 16px', background: 'rgba(239,255,66,0.08)', border: '1px solid rgba(239,255,66,0.25)', borderRadius: 10, color: '#efff42', fontSize: 12, fontWeight: 600, textDecoration: 'none', lineHeight: 1 }}>
              <span style={{ fontSize: 14 }}>↗</span>{label}
            </a>
          )
        }
        return <p key={i} style={{ fontSize: 13, color: '#e4e4e7', lineHeight: 1.72, margin: '0 0 2px' }}>{renderInline(line)}</p>
      })}
    </>
  )
}
