-- Código corto para los links de /reclamar (en vez de exponer el id/uuid entero)
-- Ejecutar en Supabase SQL Editor

alter table artists add column if not exists claim_code text unique;
alter table studios add column if not exists claim_code text unique;
