import Image from 'next/image'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Guía para Proveedores — Flashttoo',
  description: 'Todo lo que necesitás saber como marca o proveedor en Flashttoo.',
}

export default function GuiaProveedor() {
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
          Tu marca en Flashttoo
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 48 }}>
          Flashttoo es la plataforma donde tatuadores y estudios muestran su trabajo y conectan con clientes. Como proveedor, tu marca aparece frente a una audiencia 100% del mundo del tatuaje.
        </p>

        {sections.map((s, i) => (
          <Section key={i} num={`0${i + 1}`} title={s.title} content={s.content} />
        ))}

        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '48px 0' }} />
        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.04em' }}>
          ¿Querés sumarte o tenés preguntas? Contactanos por Instagram <span style={{ color: '#efff42' }}>@flashttoo</span>
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
    title: '¿Qué es un perfil de Proveedor?',
    content: (
      <>
        <P>Un perfil de proveedor en Flashttoo le da visibilidad a tu marca frente a tatuadores, estudios y clientes que ya están dentro de la plataforma.</P>
        <P>Tu logo aparece en la <B>barra de Insumos</B> en la parte inferior de la app, scrolleando de forma continua. Al tocar el botón <B>Insumos</B>, los usuarios acceden al listado completo de marcas donde pueden ver tu perfil, descripción y contacto.</P>
        <Highlight><span>🎯</span><span>Tu audiencia es 100% del mundo del tatuaje — tatuadores activos, estudios y personas que buscan hacerse un tatuaje.</span></Highlight>
      </>
    ),
  },
  {
    title: 'Qué incluye tu perfil',
    content: (
      <>
        <P>Tu perfil de proveedor puede tener:</P>
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          <Li><B>Logo</B> — tu marca tal como la usás normalmente.</Li>
          <Li><B>Descripción</B> — un texto corto que explica qué ofrecés: productos, servicios, diferencial.</Li>
          <Li><B>Link a tu web</B> — acceso directo a tu tienda, catálogo o sitio.</Li>
          <Li><B>WhatsApp</B> — para que los interesados te contacten directo.</Li>
          <Li><B>Segmentación</B> — podés aparecer en todo el país o solo en una ciudad específica.</Li>
        </ul>
        <Highlight><span>🖼️</span><span>El logo puede aparecer en color o en blanco según lo que funcione mejor con tu identidad visual.</span></Highlight>
      </>
    ),
  },
  {
    title: 'Cómo aparece en la app',
    content: (
      <>
        <P>Tu logo aparece en la <B>barra fija en la parte inferior</B> de la app, scrolleando junto a otras marcas.</P>
        <P>Al tocar el botón <B>Insumos</B> en esa barra, se abre el listado completo de marcas. Los usuarios pueden buscar por país y acceder a tu perfil con descripción, web y WhatsApp.</P>
        <P>Si tenés link, los usuarios pueden ir directo a <B>tu sitio web</B> desde tu perfil. Si tenés WhatsApp, pueden escribirte desde ahí.</P>
        <Highlight><span>📍</span><span>Si elegís segmentación por ciudad, tu logo solo aparece cuando alguien busca artistas en esa ubicación — más relevancia, mejor conversión.</span></Highlight>
      </>
    ),
  },
  {
    title: 'Duración y fechas',
    content: (
      <>
        <P>Cada perfil de proveedor tiene una <B>fecha de inicio</B> y una <B>fecha de vencimiento</B>. Tu banner aparece activo durante ese período y se desactiva automáticamente al vencer.</P>
        <P>Cuando el período esté por terminar, te avisamos para que puedas renovarlo y mantener tu presencia en la plataforma.</P>
      </>
    ),
  },
  {
    title: 'Tus estadísticas',
    content: (
      <>
        <P>Tenés acceso a una página privada con tus métricas reales. Podés ver cuántas personas interactuaron con tu marca:</P>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '16px 0' }}>
          {[['24', 'Impresiones'], ['8', 'Aperturas'], ['5', 'Web'], ['3', 'WhatsApp']].map(([val, lbl]) => (
            <div key={lbl} style={{ background: '#181818', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 16px', minWidth: 72, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.8)' }}>{val}</div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)' }}>{lbl}</div>
            </div>
          ))}
        </div>
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Li><B>Impresiones</B> — veces que tu banner apareció en el feed.</Li>
          <Li><B>Aperturas</B> — veces que alguien hizo clic para ver tu tarjeta de detalle.</Li>
          <Li><B>Web</B> — clics al link de tu sitio web.</Li>
          <Li><B>WhatsApp</B> — clics para contactarte por WhatsApp.</Li>
        </ul>
        <Highlight><span>📊</span><span>El link a tu página de estadísticas te lo enviamos al activar tu perfil. Es privado — solo vos podés verlo.</span></Highlight>
      </>
    ),
  },
  {
    title: 'Cómo empezar',
    content: (
      <>
        <P>Para sumar tu marca a Flashttoo, contactanos y te armamos el perfil. Solo necesitamos:</P>
        <ol style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          <StepLi n={1}>Tu logo en buena calidad (PNG o SVG, fondo transparente si es posible).</StepLi>
          <StepLi n={2}>Una descripción breve de tu marca o lo que ofrecés.</StepLi>
          <StepLi n={3}>El link a tu web y/o número de WhatsApp.</StepLi>
          <StepLi n={4}>Si querés segmentación por ciudad, indicarnos cuál.</StepLi>
        </ol>
        <Highlight><span>✉️</span><span>Escribinos por Instagram <B>@flashttoo</B> y te respondemos con toda la info.</span></Highlight>
      </>
    ),
  },
]
