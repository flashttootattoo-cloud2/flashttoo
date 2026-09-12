-- Aviso junto al contador de caracteres del composer: los mensajes duran 7 días
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
('es', 'comunidad', 'expires_hint', 'se borra a los 7 días'),
('en', 'comunidad', 'expires_hint', 'disappears after 7 days'),
('pt', 'comunidad', 'expires_hint', 'some após 7 dias')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
