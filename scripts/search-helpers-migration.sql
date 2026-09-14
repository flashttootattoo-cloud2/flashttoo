-- "Levantar la mano": un tatuador marca que puede ayudar con un pedido de búsqueda
-- publicado en comunidad. Reemplaza el contacto directo del cliente — ahora el
-- tatuador se ofrece y el buscador entra a su perfil para contactarlo.
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS search_helpers (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references community_posts(id) on delete cascade,
  artist_id  uuid not null references artists(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, artist_id)
);

CREATE INDEX IF NOT EXISTS search_helpers_post_idx ON search_helpers (post_id);
