import Image from 'next/image'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Guía para Estudios — Flashttoo',
  description: 'Todo lo que necesitás saber para configurar tu estudio en Flashttoo.',
}

export default function GuiaEstudio() {
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
          Tu estudio en Flashttoo
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 48 }}>
          Todo lo que necesitás saber para configurar tu perfil, agregar tus artistas y aparecer en el feed frente a las personas que buscan un estudio.
        </p>

        {/* Sections */}
        {sections.map((s, i) => (
          <Section key={i} num={`0${i + 1}`} title={s.title} content={s.content} />
        ))}

        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '48px 0' }} />
        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.04em' }}>
          ¿Dudas? Contactanos por Instagram <span style={{ color: '#efff42' }}>@flashttoo</span>
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

const Dot = () => <span style={{ width: 5, height: 5, background: '#efff42', borderRadius: '50%', display: 'inline-block', flexShrink: 0, marginTop: 9 }} />

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

const Pill = ({ children }: { children: React.ReactNode }) => (
  <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '2px 8px', color: 'rgba(255,255,255,0.8)' }}>{children}</span>
)

const B = ({ children }: { children: React.ReactNode }) => (
  <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{children}</strong>
)

const sections = [
  {
    title: '¿Qué es un perfil de Estudio?',
    content: (
      <>
        <P>Un perfil de Estudio te permite presentar tu local como marca dentro de Flashttoo. Aparece en el feed junto a los tatuadores individuales, con una etiqueta que lo identifica claramente como estudio.</P>
        <P>Desde tu perfil, los usuarios pueden ver todos los artistas que trabajan en el estudio, contactarte por Instagram o WhatsApp y visitar tu web.</P>
        <Highlight><span>💡</span><span>Tu estudio aparece en el feed de forma orgánica, igual que cualquier tatuador.</span></Highlight>
      </>
    ),
  },
  {
    title: 'Qué podés cargar',
    content: (
      <>
        <P>Tu perfil tiene los siguientes campos:</P>
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          <Li><B>Nombre</B> — el nombre de tu estudio tal como querés que aparezca.</Li>
          <Li><B>Descripción</B> — una presentación breve: estilo, ubicación, años de experiencia, lo que lo hace único.</Li>
          <Li><B>Foto</B> — el logo o imagen del estudio. <em style={{ color: 'rgba(255,255,255,0.3)' }}>Recomendamos imagen cuadrada (1:1).</em></Li>
          <Li><B>Instagram</B> — el @usuario sin URL (ej: <Pill>@tuestudio</Pill>).</Li>
          <Li><B>WhatsApp</B> — número con código de país (ej: <Pill>+54 9 11 1234 5678</Pill>).</Li>
          <Li><B>Web</B> — la URL completa de tu sitio (ej: <Pill>https://tuestudio.com</Pill>).</Li>
          <Li><B>Ciudad y país</B> — para aparecer en búsquedas por ubicación.</Li>
        </ul>
        <Highlight><span>🖼️</span><span>Usá una imagen <B>cuadrada (1:1)</B> para que se vea completa sin recorte, tanto en el feed como en el perfil.</span></Highlight>
      </>
    ),
  },
  {
    title: 'Cómo editar tu perfil',
    content: (
      <>
        <P>Para editar los datos de tu estudio, entrá a tu perfil y tocá el botón <B>···</B> en la parte inferior. Se va a abrir un panel que te pide una <B>clave de acceso</B>.</P>
        <P>Esa clave te la enviamos al crear tu perfil. Guardala en un lugar seguro — es la única forma de editar tu estudio.</P>
        <ol style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          <StepLi n={1}>Entrá a tu perfil de estudio.</StepLi>
          <StepLi n={2}>Tocá el botón <B>···</B> en la parte inferior del perfil.</StepLi>
          <StepLi n={3}>Ingresá tu clave de acceso cuando se solicite.</StepLi>
          <StepLi n={4}>Editá los campos que querás y tocá <B>Guardar cambios</B>.</StepLi>
        </ol>
      </>
    ),
  },
  {
    title: 'Cómo agregar artistas al estudio',
    content: (
      <>
        <P>Desde el mismo panel de edición, podés vincular los tatuadores que trabajan en tu estudio. Solo necesitás el <B>@usuario de Instagram</B> de cada artista (tiene que estar registrado en Flashttoo).</P>
        <ol style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          <StepLi n={1}>Abrí el panel de edición con tu clave.</StepLi>
          <StepLi n={2}>Bajá hasta la sección <B>Agregar artista por IG</B>.</StepLi>
          <StepLi n={3}>Escribí el @usuario del artista y tocá <B>Agregar</B>.</StepLi>
          <StepLi n={4}>El artista aparecerá en la galería de tu perfil de estudio.</StepLi>
        </ol>
        <Highlight><span>👥</span><span>Los artistas siguen teniendo su propio perfil independiente — el estudio los agrupa sin reemplazar su presencia en el feed.</span></Highlight>
      </>
    ),
  },
  {
    title: 'Activar una convocatoria',
    content: (
      <>
        <P>Si tu estudio está buscando tatuador o residente, podés activar un cartel que aparece directamente en el feed sobre tu tarjeta.</P>
        <ol style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          <StepLi n={1}>Abrí el panel de edición con tu clave.</StepLi>
          <StepLi n={2}>Bajá hasta la sección <B>Convocatoria</B>.</StepLi>
          <StepLi n={3}>Activá el toggle y elegí si buscás <B>Tatuador</B> o <B>Residente</B>.</StepLi>
          <StepLi n={4}>Tocá <B>Guardar cambios</B>. El cartel aparece de inmediato en el feed.</StepLi>
        </ol>
        <div style={{ margin: '16px 0 4px' }}>
          <span style={{ fontSize: 8, fontWeight: 600, color: '#000', letterSpacing: '0.08em', textTransform: 'uppercase', background: '#efff42', padding: '2px 10px', borderRadius: 4 }}>Se busca tatuador</span>
        </div>
        <Highlight><span>💼</span><span>Cuando cubrís el puesto, desactivá el toggle y guardá para que el cartel desaparezca.</span></Highlight>
      </>
    ),
  },
  {
    title: 'Publicar un Flash Day',
    content: (
      <>
        <P>Un Flash Day es un evento de un día en el que el estudio trabaja solo o con artistas invitados. Podés publicarlo con flyer y fecha — aparece en la sección de <B>Eventos</B> de Flashttoo y también puede salir en el popup inicial que ven los usuarios al abrir la app.</P>
        <ol style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          <StepLi n={1}>Abrí el panel de edición con tu clave.</StepLi>
          <StepLi n={2}>Bajá hasta la sección <B>Flash Days</B>.</StepLi>
          <StepLi n={3}>Elegí la fecha del evento y subí el flyer.</StepLi>
          <StepLi n={4}>Tocá <B>Publicar</B>. El Flash Day aparece de inmediato en Eventos.</StepLi>
        </ol>
        <Highlight><span>📅</span><span>La fecha y el flyer son <B>obligatorios</B>. Una vez pasada la fecha, el evento deja de aparecer automáticamente. También podés eliminarlo antes desde el mismo panel.</span></Highlight>
      </>
    ),
  },
  {
    title: 'Cómo aparece en el feed',
    content: (
      <>
        <P>Tu estudio aparece como una tarjeta dentro del feed de artistas, con el mismo tamaño que un tatuador. Lo que lo diferencia es la etiqueta en la esquina:</P>
        <div style={{ margin: '14px 0 6px' }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(239,255,66,0.7)', background: 'rgba(0,0,0,0.6)', padding: '4px 9px', borderRadius: 8, border: '1px solid rgba(239,255,66,0.25)' }}>Estudio</span>
        </div>
        <P>La posición en el feed es aleatoria y varía entre sesiones, para que tu estudio tenga exposición natural sin estar siempre en el mismo lugar.</P>
        <P>Si un usuario filtra por <B>estilo</B> (Realismo, Old School, etc.) o <B>ciudad</B>, tu estudio aparece si alguno de tus artistas vinculados trabaja ese estilo o está en esa ubicación.</P>
      </>
    ),
  },
  {
    title: 'Tus estadísticas',
    content: (
      <>
        <P>En la parte inferior del perfil de tu estudio podés ver métricas reales de cómo interactúan los usuarios:</P>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '16px 0' }}>
          {[['12', 'Visitas'], ['4', 'Instagram'], ['2', 'WhatsApp'], ['1', 'Web']].map(([val, lbl]) => (
            <div key={lbl} style={{ background: '#181818', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 18px', minWidth: 70, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.8)' }}>{val}</div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)' }}>{lbl}</div>
            </div>
          ))}
        </div>
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Li><B>Visitas</B> — veces que alguien ingresó al perfil de tu estudio desde el feed.</Li>
          <Li><B>Instagram</B> — clics al botón de Instagram desde tu perfil.</Li>
          <Li><B>WhatsApp</B> — clics al botón de WhatsApp (solo aparece si lo tenés cargado).</Li>
          <Li><B>Web</B> — clics a tu sitio web (solo aparece si lo tenés cargado).</Li>
        </ul>
      </>
    ),
  },
  {
    title: 'Compartir el perfil',
    content: (
      <>
        <P>En la parte inferior del perfil hay un botón de compartir <B>↑</B>. Al tocarlo, podés enviar el link de tu estudio directamente a clientes o subirlo a tus redes.</P>
        <P>Si el dispositivo soporta el menú nativo de compartir (celular), se abre automáticamente. Si no, el link se copia al portapapeles.</P>
      </>
    ),
  },
]
