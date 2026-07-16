import Image from 'next/image'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Guía para Convenciones — Flashttoo',
  description: 'Cómo promocionar tu convención de tatuajes en Flashttoo.',
}

export default function GuiaConvencion() {
  return (
    <main style={{ background: '#0a0a0a', minHeight: '100vh', padding: '48px 20px 80px' }}>
      <div style={{ maxWidth: 660, margin: '0 auto' }}>

        {/* Logo */}
        <div style={{ marginBottom: 48 }}>
          <Image src="/Logoprincipal.svg" alt="Flashttoo" width={160} height={45} priority />
        </div>

        {/* Hero */}
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#efff42', marginBottom: 12 }}>
          Guía de uso
        </p>
        <h1 style={{ fontSize: 'clamp(28px, 6vw, 42px)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.08, color: '#fff', marginBottom: 16 }}>
          Tu convención en Flashttoo
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 48 }}>
          Flashttoo es la plataforma donde tatuadores y estudios conectan con clientes. Promover tu convención acá significa llegar directamente a las personas del ambiente que ya están usando la app.
        </p>

        {sections.map((s, i) => (
          <Section key={i} num={`0${i + 1}`} title={s.title} content={s.content} />
        ))}

        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '48px 0' }} />
        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.04em' }}>
          ¿Querés sumar tu evento? Contactanos por Instagram <span style={{ color: '#efff42' }}>@flashttoo</span>
        </p>

      </div>
    </main>
  )
}

function Section({ num, title, content }: { num: string; title: string; content: React.ReactNode }) {
  return (
    <div style={{
      background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16,
      padding: '28px 28px 24px', marginBottom: 16, position: 'relative',
    }}>
      <div style={{ position: 'absolute', left: 0, top: 20, bottom: 20, width: 3, background: 'rgba(239,255,66,0.3)', borderRadius: '0 2px 2px 0' }} />
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#efff42', display: 'block', marginBottom: 8 }}>
        {num} —
      </span>
      <h2 style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff', marginBottom: 14, lineHeight: 1.2 }}>{title}</h2>
      {content}
    </div>
  )
}

const P = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.75, marginBottom: 10 }}>{children}</p>
)

const Dot = () => (
  <span style={{ width: 5, height: 5, background: '#efff42', borderRadius: '50%', display: 'inline-block', flexShrink: 0, marginTop: 9 }} />
)

const Li = ({ children }: { children: React.ReactNode }) => (
  <li style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
    <Dot /><span>{children}</span>
  </li>
)

const StepLi = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <li style={{ display: 'flex', gap: 14, alignItems: 'flex-start', fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
    <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(239,255,66,0.12)', border: '1px solid rgba(239,255,66,0.3)', color: '#efff42', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</span>
    <span style={{ paddingTop: 2 }}>{children}</span>
  </li>
)

const Highlight = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: 'rgba(239,255,66,0.08)', border: '1px solid rgba(239,255,66,0.25)', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: 'rgba(239,255,66,0.75)', lineHeight: 1.6, marginTop: 14, display: 'flex', gap: 10 }}>
    {children}
  </div>
)

const B = ({ children }: { children: React.ReactNode }) => (
  <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{children}</strong>
)

const sections = [
  {
    title: '¿Cómo aparece tu convención?',
    content: (
      <>
        <P>Al abrir la app, los usuarios ven un <B>popup con el flyer de tu evento</B> antes de empezar a explorar artistas. Es el primer elemento que ven — máxima visibilidad.</P>
        <P>El flyer se muestra completo, sin recorte. Si el evento tiene un link, aparece un botón <B>Ver más →</B> que lleva directo a donde vos quieras: sitio web, redes, ticket, lo que prefieras.</P>
        <Highlight><span>👁️</span><span>El popup aparece <B>una vez por sesión</B> — no es invasivo para el usuario, pero sí garantiza que lo vea cada vez que abre la app.</span></Highlight>
      </>
    ),
  },
  {
    title: 'Qué necesitás para publicar',
    content: (
      <>
        <P>Para aparecer en Flashttoo solo necesitamos:</P>
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          <Li><B>Flyer del evento</B> — la imagen que ya usás para promocionar la convención. Puede ser vertical, horizontal o cuadrada.</Li>
          <Li><B>Nombre del evento</B> (opcional) — se muestra debajo del flyer en el popup.</Li>
          <Li><B>Link</B> (opcional) — a donde querés llevar a quien hace clic: web, Instagram, Eventbrite, etc.</Li>
          <Li><B>Fecha de vencimiento</B> (opcional) — el popup se desactiva automáticamente después del evento.</Li>
        </ul>
        <Highlight><span>🖼️</span><span>Mandanos el flyer que ya tenés — no hace falta diseñar nada nuevo. Usamos la imagen tal cual.</span></Highlight>
      </>
    ),
  },
  {
    title: 'Duración',
    content: (
      <>
        <P>Tu convención puede estar activa durante el período que necesites — desde semanas antes del evento hasta la fecha del mismo.</P>
        <P>Al vencer, el popup se desactiva automáticamente. Si querés extenderlo o actualizarlo, nos avisás y lo hacemos.</P>
      </>
    ),
  },
  {
    title: 'Varias convenciones activas',
    content: (
      <>
        <P>Si hay más de una convención activa al mismo tiempo, cada usuario ve <B>una sola por sesión</B>, elegida al azar. Esto garantiza exposición equilibrada entre todos los eventos activos.</P>
        <P>Cada vez que alguien abre la app en una nueva sesión, puede ver una convención diferente — lo que hace que la rotación sea natural y no molesta para el usuario.</P>
        <Highlight><span>🎲</span><span>Cuanto más tiempo esté activa tu convención, más sesiones alcanza — cada apertura de la app es una oportunidad de exposición.</span></Highlight>
      </>
    ),
  },
  {
    title: 'Botón Convenciones en la app',
    content: (
      <>
        <P>Además del popup al abrir la app, todas las convenciones activas pueden encontrarse en el <B>botón Convenciones</B> dentro de la app. Los usuarios que quieran explorar eventos pueden acceder desde ahí en cualquier momento.</P>
        <P>Esto le da a tu convención una segunda vía de descubrimiento — no solo el popup inicial, sino también quienes buscan activamente eventos.</P>
      </>
    ),
  },
  {
    title: 'Cómo sumarte',
    content: (
      <>
        <P>Contactanos y en pocas horas tu convención está activa en la app:</P>
        <ol style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          <StepLi n={1}>Mandanos el flyer de tu evento.</StepLi>
          <StepLi n={2}>Indicanos el nombre, el link y hasta cuándo querés que esté activo.</StepLi>
          <StepLi n={3}>Nosotros lo cargamos y aparece en la app.</StepLi>
        </ol>
        <Highlight><span>✉️</span><span>Escribinos por Instagram <B>@flashttoo</B> y te respondemos rápido.</span></Highlight>
      </>
    ),
  },
]
