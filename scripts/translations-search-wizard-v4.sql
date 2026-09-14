-- Botón final del asistente cambia de texto según si hay contenido para publicar
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
('es', 'buscador', 'search_cta_send', 'Enviar mensaje y buscar tatuadores'),
('es', 'buscador', 'search_cta_skip', 'Saltear y buscar'),
('en', 'buscador', 'search_cta_send', 'Send message and search artists'),
('en', 'buscador', 'search_cta_skip', 'Skip and search'),
('pt', 'buscador', 'search_cta_send', 'Enviar mensagem e buscar tatuadores'),
('pt', 'buscador', 'search_cta_skip', 'Pular e buscar')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
