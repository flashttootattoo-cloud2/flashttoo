-- El registro de estudios deja de usar un link fijo público — ahora el admin
-- genera un link único de un solo uso por cada estudio que quiera invitar.
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS studio_invites (
  id                uuid primary key default gen_random_uuid(),
  token             text not null unique,
  used_by_studio_id uuid references studios(id) on delete set null,
  used_at           timestamptz,
  created_at        timestamptz not null default now()
);
