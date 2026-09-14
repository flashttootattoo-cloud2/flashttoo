-- "Asistente de búsqueda": visitantes no logueados arman con toques (sin escribir)
-- qué tatuaje buscan, eso dispara la búsqueda de tatuadores y deja una señal
-- de demanda en la comunidad (mensaje que se arma solo según lo que completaron).
-- Ejecutar en Supabase SQL Editor

ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS search_category text;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS search_size text;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS search_zones jsonb;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS search_style text;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS search_description text;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS device_id text;

CREATE INDEX IF NOT EXISTS community_posts_device_idx ON community_posts (device_id, created_at) WHERE device_id IS NOT NULL;

-- El check de "type" no incluía 'search' — lo agregamos
ALTER TABLE community_posts DROP CONSTRAINT IF EXISTS community_posts_type_check;
ALTER TABLE community_posts ADD CONSTRAINT community_posts_type_check
  CHECK (type IN ('artist', 'studio', 'sponsor', 'client', 'admin', 'search'));
