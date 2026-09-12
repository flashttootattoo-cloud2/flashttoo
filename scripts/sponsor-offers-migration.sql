-- "Pedido Flash": la marca arma ofertas guardadas desde su menú (biblioteca),
-- y después elige cuál adjuntar al publicar en la comunidad.
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS sponsor_offers (
  id         uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references sponsors_v2(id) on delete cascade,
  title      text not null,
  whatsapp   text not null,
  items      jsonb not null,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS sponsor_offers_sponsor_idx ON sponsor_offers (sponsor_id);

-- Por si ya habías corrido una versión anterior de esta migración sin la columna whatsapp
ALTER TABLE sponsor_offers ADD COLUMN IF NOT EXISTS whatsapp text;

-- El mensaje de comunidad guarda una copia congelada de la oferta al momento de publicar
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS offer_title text;
