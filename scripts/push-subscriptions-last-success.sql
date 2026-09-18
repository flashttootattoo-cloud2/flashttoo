-- Guarda cuándo fue la última vez que una suscripción recibió algo con
-- éxito, para poder distinguir en las estadísticas una vieja-pero-sana de
-- una que quedó huérfana
-- Ejecutar en Supabase SQL Editor

ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS last_success_at timestamptz;
