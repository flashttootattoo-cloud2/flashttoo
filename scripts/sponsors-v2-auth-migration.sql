-- Registro propio de marcas (mismo patrón que estudios)
-- Ejecutar en Supabase SQL Editor

ALTER TABLE sponsors_v2 ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE sponsors_v2 ADD COLUMN IF NOT EXISTS auth_email text;
ALTER TABLE sponsors_v2 ADD COLUMN IF NOT EXISTS slug text;

-- El perfil nace en blanco (lo completa el admin después), todavía no tiene logo
ALTER TABLE sponsors_v2 ALTER COLUMN logo_url DROP NOT NULL;

-- Recuerda con qué marca ya cargada quedó vinculado este registro, para poder re-vincular
ALTER TABLE sponsors_v2 ADD COLUMN IF NOT EXISTS linked_from uuid;

CREATE UNIQUE INDEX IF NOT EXISTS sponsors_v2_slug_key ON sponsors_v2 (slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS sponsors_v2_user_id_key ON sponsors_v2 (user_id) WHERE user_id IS NOT NULL;
