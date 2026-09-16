-- Texto de la vista previa cuando todavía no eligieron "¿Para qué?" — ya
-- arranca con la frase empezada, en vez de una instrucción genérica
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
('es', 'comunidad', 'req_preview_empty', 'Busco tattoo artist para...'),
('en', 'comunidad', 'req_preview_empty', 'Looking for a tattoo artist for...'),
('pt', 'comunidad', 'req_preview_empty', 'Procuro um tatuador para...')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
