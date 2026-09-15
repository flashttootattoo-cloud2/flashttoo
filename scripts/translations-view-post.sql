-- Botón "Ver publicación" para mensajes de admin con link
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
('es', 'comunidad', 'view_post', 'Ver publicación'),
('en', 'comunidad', 'view_post', 'View post'),
('pt', 'comunidad', 'view_post', 'Ver publicação')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
