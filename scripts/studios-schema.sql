-- Tabla de estudios de tatuaje
create table if not exists studios (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  city          text,
  country       text,
  description   text,
  logo_url      text,
  instagram     text,
  whatsapp      text,
  website       text,
  edit_key      text not null,
  visible       boolean not null default false,
  profile_views integer not null default 0,
  instagram_clicks integer not null default 0,
  whatsapp_clicks  integer not null default 0,
  created_at    timestamptz not null default now()
);

-- Vinculación estudio ↔ artista
create table if not exists studio_artists (
  id         uuid primary key default gen_random_uuid(),
  studio_id  uuid not null references studios(id) on delete cascade,
  artist_id  uuid not null references artists(id) on delete cascade,
  added_at   timestamptz not null default now(),
  unique(studio_id, artist_id)
);
