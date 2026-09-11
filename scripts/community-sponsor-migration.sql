-- Permite que las marcas posteen en la comunidad como cuenta de marca
-- Ejecutar en Supabase SQL Editor

ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS sponsor_id text;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS sponsor_name text;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS sponsor_logo text;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS sponsor_slug text;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS sponsor_description text;

-- El check de "type" no incluía 'sponsor' — lo agregamos
ALTER TABLE community_posts DROP CONSTRAINT IF EXISTS community_posts_type_check;
ALTER TABLE community_posts ADD CONSTRAINT community_posts_type_check
  CHECK (type IN ('artist', 'studio', 'sponsor', 'client', 'admin'));
