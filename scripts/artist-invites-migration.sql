-- Sistema de invitaciones para el registro de tatuadores
-- El registro deja de ser abierto: solo se puede crear cuenta con un link de invitación válido.
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS artist_invites (
  id                    uuid primary key default gen_random_uuid(),
  token                 text not null unique,
  created_by_artist_id  uuid references artists(id) on delete set null,
  created_by_admin      boolean not null default false,
  used_by_artist_id     uuid references artists(id) on delete set null,
  used_at               timestamptz,
  created_at            timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS artist_invites_created_by_idx ON artist_invites (created_by_artist_id);

-- Quién invitó a cada tatuador (invited_by_name queda "congelado" al momento de usar el link,
-- así el pie del perfil no depende de un join en vivo)
ALTER TABLE artists ADD COLUMN IF NOT EXISTS invited_by uuid references artists(id) on delete set null;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS invited_by_admin boolean not null default false;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS invited_by_name text;

-- Saldo de invitaciones de cada tatuador — arrancan con 3 (incluidos los que ya existen, retroactivo)
ALTER TABLE artists ADD COLUMN IF NOT EXISTS invite_starter_remaining int not null default 3;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS invite_monthly_used boolean not null default false;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS invite_monthly_month text;

-- Retroactivo, una sola vez: los que YA tienen cuenta por mail (registro directo o migrados
-- desde el sistema viejo) quedan marcados como invitados por Flashttoo.
-- Los que se registren de acá en adelante ya vienen con su propio invitador real.
UPDATE artists
SET invited_by_admin = true, invited_by_name = 'Flashttoo'
WHERE user_id IS NOT NULL AND invited_by_name IS NULL;

-- Moderación: el admin puede cortarle las invitaciones a un tatuador puntual
-- (por ejemplo, si está invitando gente de mala calidad) sin tocar el resto de su cuenta.
ALTER TABLE artists ADD COLUMN IF NOT EXISTS invites_disabled boolean not null default false;
