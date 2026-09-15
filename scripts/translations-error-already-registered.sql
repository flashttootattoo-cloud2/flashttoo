-- Mensaje claro cuando el insert de artista choca con la constraint de user_id duplicado
-- (antes se mostraba el error técnico de Postgres tal cual)
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
('es', 'agregar', 'error_already_registered', 'Ya completaste tu perfil con esta cuenta. Iniciá sesión en vez de volver a registrarte.'),
('en', 'agregar', 'error_already_registered', 'You already completed your profile with this account. Sign in instead of registering again.'),
('pt', 'agregar', 'error_already_registered', 'Você já completou seu perfil com essa conta. Faça login em vez de se registrar de novo.')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
