-- Bloque de notificaciones que reemplaza el formulario "Busco tattoo artist" para no registrados
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
('es', 'comunidad', 'anon_push_title', 'Novedades de Flashttoo'),
('en', 'comunidad', 'anon_push_title', 'Flashttoo news'),
('pt', 'comunidad', 'anon_push_title', 'Novidades do Flashttoo'),

('es', 'comunidad', 'anon_push_body', 'Activá las notificaciones y enterate de lo que pasa en tu ciudad: convenciones, novedades y avisos de Flashttoo.'),
('en', 'comunidad', 'anon_push_body', 'Turn on notifications and find out what is happening in your city: conventions, news and Flashttoo announcements.'),
('pt', 'comunidad', 'anon_push_body', 'Ative as notificações e fique sabendo do que acontece na sua cidade: convenções, novidades e avisos do Flashttoo.'),

('es', 'comunidad', 'anon_push_viewing', 'Estás viendo las novedades de {country}'),
('en', 'comunidad', 'anon_push_viewing', 'You are seeing news from {country}'),
('pt', 'comunidad', 'anon_push_viewing', 'Você está vendo as novidades de {country}')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
