import Image from 'next/image'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Guía para Tatuadores — Flashttoo',
  description: 'Todo lo que podés hacer como tatuador en Flashttoo. Es gratis.',
}

export default function GuiaTatuador() {
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
          Tu perfil de tatuador en Flashttoo
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 20 }}>
          Flashttoo es una plataforma para conectar tatuadores con personas que buscan hacerse un tatuaje. Podés mostrar tu trabajo, tu estilo y tus contactos — y los clientes te encuentran a vos.
        </p>

        {/* Free badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(239,255,66,0.1)', border: '1px solid rgba(239,255,66,0.3)', borderRadius: 20, padding: '8px 18px', marginBottom: 48 }}>
          <span style={{ fontSize: 16 }}>✓</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#efff42', letterSpacing: '0.02em' }}>Completamente gratis</span>
        </div>

        {sections.map((s, i) => (
          <Section key={i} num={`0${i + 1}`} title={s.title} content={s.content} />
        ))}

        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '48px 0' }} />
        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.04em' }}>
          ¿Querés sumarte? Contactanos por Instagram <span style={{ color: '#efff42' }}>@flashttoo</span>
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
    title: 'Tu perfil en el feed',
    content: (
      <>
        <P>Tu foto de perfil aparece como una tarjeta en el feed principal de Flashttoo, junto a otros tatuadores. Cuando alguien la toca, se abre tu perfil completo con toda tu información.</P>
        <P>El feed mezcla a todos los tatuadores de forma aleatoria — no hay un orden fijo ni ranking. Todos tienen la misma exposición.</P>
        <Highlight><span>🆓</span><span>Estar en Flashttoo es <B>completamente gratis</B>. No hay planes, no hay suscripciones, no hay costos ocultos.</span></Highlight>
      </>
    ),
  },
  {
    title: 'Qué podés mostrar en tu perfil',
    content: (
      <>
        <P>Tu perfil puede incluir:</P>
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          <Li><B>Foto de perfil</B> — tu imagen principal, la que ven en el feed.</Li>
          <Li><B>Nombre</B> — como querés que te conozcan.</Li>
          <Li><B>Ciudad y país</B> — para que te encuentren por ubicación.</Li>
          <Li><B>Estilos</B> — los estilos que trabajás: Realismo, Old School, Japonés, Geométrico, etc.</Li>
          <Li><B>Bio</B> — una descripción libre sobre vos y tu trabajo.</Li>
          <Li><B>Instagram y WhatsApp</B> — para que los clientes te contacten directo.</Li>
        </ul>
      </>
    ),
  },
  {
    title: 'Cómo te encuentran los clientes',
    content: (
      <>
        <P>Los usuarios pueden buscar tatuadores de dos formas:</P>
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8, marginBottom: 10 }}>
          <Li><B>Por estilo</B> — filtran por Realismo, Old School, Acuarela, etc. Si trabajás ese estilo, aparecés.</Li>
          <Li><B>Por ciudad o país</B> — buscan tatuadores en su zona y aparecés si tu ubicación coincide.</Li>
        </ul>
        <P>Cuanto más completo esté tu perfil — con los estilos bien cargados y tu ciudad correcta — más chances tenés de aparecer en búsquedas relevantes.</P>
      </>
    ),
  },
  {
    title: 'Editar tu perfil',
    content: (
      <>
        <P>Para editar tu perfil, abrilo desde el feed y tocá el botón <B>···</B> en la parte inferior. Vas a necesitar tu <B>clave de acceso</B> — te la enviamos cuando te sumaste a la plataforma.</P>
        <P>Desde el panel de edición podés actualizar tu foto, bio, contacto, estilos y galería en cualquier momento.</P>
        <Highlight><span>🔑</span><span>Guardá tu clave en un lugar seguro — es la única forma de editar tu perfil. Si la perdés, contactanos y te ayudamos.</span></Highlight>
      </>
    ),
  },
  {
    title: 'Tus estadísticas',
    content: (
      <>
        <P>En tu perfil podés ver métricas reales de cuántos usuarios interactuaron con vos:</P>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '16px 0' }}>
          {[['18', 'Visitas'], ['6', 'Instagram'], ['3', 'WhatsApp'], ['12', 'Me gusta']].map(([val, lbl]) => (
            <div key={lbl} style={{ background: '#181818', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 16px', minWidth: 72, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.8)' }}>{val}</div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)' }}>{lbl}</div>
            </div>
          ))}
        </div>
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Li><B>Visitas</B> — cuántas veces alguien abrió tu perfil.</Li>
          <Li><B>Instagram</B> — cuántas veces hicieron clic en tu Instagram.</Li>
          <Li><B>WhatsApp</B> — cuántas veces te contactaron por WhatsApp.</Li>
          <Li><B>Me gusta</B> — cuántos usuarios marcaron tu perfil como favorito.</Li>
        </ul>
      </>
    ),
  },
  {
    title: 'Compartir tu perfil',
    content: (
      <>
        <P>Desde tu perfil hay un botón de compartir <B>↑</B> que te da el link directo. Podés enviárselo a clientes o publicarlo en tus redes para que lleguen directo a tu perfil en Flashttoo.</P>
      </>
    ),
  },
  {
    title: 'Cómo sumarte',
    content: (
      <>
        <P>Para estar en Flashttoo, contactanos y te cargamos el perfil. Solo necesitamos:</P>
        <ol style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          <StepLi n={1}>Tu foto de perfil (que represente bien tu trabajo).</StepLi>
          <StepLi n={2}>Tu nombre, ciudad y país.</StepLi>
          <StepLi n={3}>Los estilos que trabajás.</StepLi>
          <StepLi n={4}>Tu Instagram y/o WhatsApp.</StepLi>
        </ol>
        <Highlight><span>✉️</span><span>Escribinos por Instagram <B>@flashttoo</B> y en poco tiempo estás en el feed.</span></Highlight>
      </>
    ),
  },
]
