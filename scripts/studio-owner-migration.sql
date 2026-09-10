-- Agregar campo is_owner a la tabla studio_artists
ALTER TABLE studio_artists ADD COLUMN IF NOT EXISTS is_owner boolean NOT NULL DEFAULT false;
