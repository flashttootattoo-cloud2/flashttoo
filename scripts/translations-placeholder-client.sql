-- Unifica el texto del composer de comunidad (no logueados) con el del asistente de búsqueda
-- Ejecutar en Supabase SQL Editor

UPDATE translations SET value = 'Contanos qué te querés tatuar'
WHERE section = 'comunidad' AND key = 'placeholder_client' AND language_code = 'es';

UPDATE translations SET value = 'Tell us what you want to get tattooed'
WHERE section = 'comunidad' AND key = 'placeholder_client' AND language_code = 'en';

UPDATE translations SET value = 'Conte o que você quer tatuar'
WHERE section = 'comunidad' AND key = 'placeholder_client' AND language_code = 'pt';
