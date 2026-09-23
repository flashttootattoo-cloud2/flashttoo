-- Agrega ciudad a las suscripciones push, para poder dirigir avisos
-- (ej. "cupo de último momento", flash day) por ciudad y no solo por país
-- Ejecutar en Supabase SQL Editor

alter table push_subscriptions add column if not exists city text;
