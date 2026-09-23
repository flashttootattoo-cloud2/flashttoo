-- Placeholder del campo ciudad en notificaciones
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
('es', 'inicio', 'push_city_placeholder', 'Tu ciudad'),
('en', 'inicio', 'push_city_placeholder', 'Your city'),
('pt', 'inicio', 'push_city_placeholder', 'Sua cidade')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
