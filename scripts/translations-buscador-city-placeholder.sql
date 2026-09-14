-- Placeholder propio de ciudad para el paso del asistente (sin el "primero elegí un país",
-- que ahí no aplica porque el país ya se eligió en el paso anterior)
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
('es', 'buscador', 'city_placeholder', 'ciudad de {country}'),
('en', 'buscador', 'city_placeholder', 'city in {country}'),
('pt', 'buscador', 'city_placeholder', 'cidade de {country}')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
