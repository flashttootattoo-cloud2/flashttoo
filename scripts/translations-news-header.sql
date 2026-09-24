-- Renombra el panel "Comunidad" a "News" en todos los idiomas (es unidireccional, informa Flashttoo)
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
('es', 'comunidad', 'header', 'News'),
('en', 'comunidad', 'header', 'News'),
('pt', 'comunidad', 'header', 'News')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
