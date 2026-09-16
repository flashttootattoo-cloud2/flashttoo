-- El chip de categoría se sacó: ahora es un solo chip que abre la lista
-- completa de mensajes (agrupados solo visualmente). Actualiza el texto de
-- los dos labels que cambiaron de sentido.
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
('es', 'comunidad', 'tpl_subcat_label', 'Elegí un mensaje'),
('en', 'comunidad', 'tpl_subcat_label', 'Pick a message'),
('pt', 'comunidad', 'tpl_subcat_label', 'Escolha uma mensagem'),

('es', 'comunidad', 'tpl_preview_empty', 'Elegí un mensaje para empezar...'),
('en', 'comunidad', 'tpl_preview_empty', 'Pick a message to start...'),
('pt', 'comunidad', 'tpl_preview_empty', 'Escolha uma mensagem para começar...')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
