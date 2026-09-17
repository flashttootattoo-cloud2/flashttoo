-- Suscripciones a notificaciones push (anónimas, sin login — solo país e
-- idioma que ya tenían tipeado en el buscador, para poder segmentar)
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  endpoint   text unique not null,
  p256dh     text not null,
  auth       text not null,
  country    text,
  lang       text,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_country_idx ON push_subscriptions (country);
