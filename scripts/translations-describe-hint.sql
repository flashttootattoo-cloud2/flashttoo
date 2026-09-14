-- Subtítulo bajo "Contanos qué te querés tatuar" pidiendo tamaño y zona,
-- y ejemplo del placeholder actualizado para mostrar ambos datos
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
('es', 'buscador', 'describe_hint_size_zone', 'Contá tamaño y zona del cuerpo'),
('en', 'buscador', 'describe_hint_size_zone', 'Mention the size and body area'),
('pt', 'buscador', 'describe_hint_size_zone', 'Conte o tamanho e a área do corpo')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;

UPDATE translations SET value = 'ej: quiero una rosa mediana en el antebrazo, a color'
WHERE section = 'buscador' AND key = 'describe_placeholder' AND language_code = 'es';

UPDATE translations SET value = 'e.g: I want a medium rose on my forearm, in color'
WHERE section = 'buscador' AND key = 'describe_placeholder' AND language_code = 'en';

UPDATE translations SET value = 'ex: quero uma rosa média no antebraço, colorida'
WHERE section = 'buscador' AND key = 'describe_placeholder' AND language_code = 'pt';
