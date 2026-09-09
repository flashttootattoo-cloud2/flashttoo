-- Tabla para videos de Cultura
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS cultura_videos (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  video_url        text,                          -- null después de archivar
  cover_image_url  text        NOT NULL,
  author_instagram       text        NOT NULL DEFAULT '',
  author_flashttoo_slug  text,                          -- slug del perfil en Flashttoo (opcional)
  instagram_video_url    text,                          -- link al post original en IG
  -- descripciones y tags por idioma (description/tags = español por defecto)
  description_en         text,
  description_pt         text,
  tags_en                text[] NOT NULL DEFAULT '{}',
  tags_pt                text[] NOT NULL DEFAULT '{}',
  description      text,
  tags             text[]      NOT NULL DEFAULT '{}',
  publish_at       timestamptz,                   -- programar publicación
  published_at     timestamptz,                   -- cuando salió al aire
  archived_at      timestamptz,                   -- cuando pasó a archivo
  video_deleted_at timestamptz,                   -- cuando se borró el video de R2
  mute_audio       boolean     NOT NULL DEFAULT false,
  active           boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Migración: agregar columna si la tabla ya existe
ALTER TABLE cultura_videos ADD COLUMN IF NOT EXISTS author_flashttoo_slug text;
ALTER TABLE cultura_videos ADD COLUMN IF NOT EXISTS instagram_video_url text;
ALTER TABLE cultura_videos ADD COLUMN IF NOT EXISTS description_en text;
ALTER TABLE cultura_videos ADD COLUMN IF NOT EXISTS description_pt text;
ALTER TABLE cultura_videos ADD COLUMN IF NOT EXISTS tags_en text[] NOT NULL DEFAULT '{}';
ALTER TABLE cultura_videos ADD COLUMN IF NOT EXISTS tags_pt text[] NOT NULL DEFAULT '{}';
ALTER TABLE cultura_videos ADD COLUMN IF NOT EXISTS mute_audio boolean NOT NULL DEFAULT false;

-- Índices
CREATE INDEX IF NOT EXISTS cultura_videos_active_idx    ON cultura_videos (active, published_at DESC);
CREATE INDEX IF NOT EXISTS cultura_videos_archived_idx  ON cultura_videos (archived_at) WHERE archived_at IS NOT NULL;
