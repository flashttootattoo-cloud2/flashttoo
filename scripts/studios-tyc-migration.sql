-- Registro de aceptación de términos para estudios (igual que ya tienen los tatuadores)
-- Ejecutar en Supabase SQL Editor

alter table studios add column if not exists tyc_accepted_at timestamptz;
