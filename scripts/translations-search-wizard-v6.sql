-- Placeholder del botón "Tipo de tatuaje" (parche/pieza + tamaño combinados en un solo selector)
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
('es', 'buscador', 'type_placeholder', 'Tipo de tatuaje'),
('en', 'buscador', 'type_placeholder', 'Tattoo type'),
('pt', 'buscador', 'type_placeholder', 'Tipo de tatuagem')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
