-- Aviso de que el mensaje se publica en comunidad, en el paso "qué te querés tatuar"
-- del asistente de búsqueda (ahora un solo paso, con parche/pieza/tamaño/estilo
-- como chips opcionales debajo del texto, en vez de pasos separados)
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
('es', 'buscador', 'describe_community_hint', 'Esto se publica en la comunidad — tatuadores de tu zona lo van a ver.'),
('en', 'buscador', 'describe_community_hint', 'This gets posted in the community — artists near you will see it.'),
('pt', 'buscador', 'describe_community_hint', 'Isso é publicado na comunidade — tatuadores da sua região vão ver.')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
