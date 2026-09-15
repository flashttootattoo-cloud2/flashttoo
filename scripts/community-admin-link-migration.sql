-- Link opcional para mensajes de admin (ej. compartir un flash day de un estudio
-- con link a la publicación de Instagram original)
-- Ejecutar en Supabase SQL Editor

ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS link text;
