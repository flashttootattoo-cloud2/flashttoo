-- Tabla para los videos de marca en Insumos (varios, uno por país o global)
-- Ejecutar en Supabase SQL Editor

create table if not exists insumos_videos (
  id uuid primary key default gen_random_uuid(),
  video_url text not null,
  link text,
  sponsor_name text,
  country text,           -- null/vacío = se muestra a todos (global)
  active boolean not null default false,
  created_at timestamptz not null default now()
);
