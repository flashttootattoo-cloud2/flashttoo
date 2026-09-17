-- Toggle de notificaciones en el menú de los tres puntos
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
('es', 'inicio', 'menu_notifications', 'Notificaciones'),
('en', 'inicio', 'menu_notifications', 'Notifications'),
('pt', 'inicio', 'menu_notifications', 'Notificações')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
