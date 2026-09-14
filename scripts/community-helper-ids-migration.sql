-- Columna para la nueva función "Me interesa esta pieza" en mensajes de búsqueda
-- Guarda directo en el post los ids de tatuadores que se ofrecieron (sin tabla aparte)
-- Ejecutar en Supabase SQL Editor

ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS helper_ids uuid[] DEFAULT '{}'::uuid[];
