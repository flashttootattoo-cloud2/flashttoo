-- Tabla para videos de Cultura
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS cultura_videos (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  video_url        text,                          -- null después de archivar
  cover_image_url  text        NOT NULL,
  author_instagram text        NOT NULL DEFAULT '',
  description      text,
  tags             text[]      NOT NULL DEFAULT '{}',
  publish_at       timestamptz,                   -- programar publicación
  published_at     timestamptz,                   -- cuando salió al aire
  archived_at      timestamptz,                   -- cuando pasó a archivo
  video_deleted_at timestamptz,                   -- cuando se borró el video de R2
  active           boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS cultura_videos_active_idx    ON cultura_videos (active, published_at DESC);
CREATE INDEX IF NOT EXISTS cultura_videos_archived_idx  ON cultura_videos (archived_at) WHERE archived_at IS NOT NULL;
