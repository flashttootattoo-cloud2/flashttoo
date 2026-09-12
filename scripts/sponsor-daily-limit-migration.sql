-- Límite diario de mensajes en comunidad, configurable por el admin por cada marca
-- (NULL = sin límite)
-- Ejecutar en Supabase SQL Editor

ALTER TABLE sponsors_v2 ADD COLUMN IF NOT EXISTS daily_post_limit integer;
