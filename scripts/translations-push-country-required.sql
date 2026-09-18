-- Aviso cuando intentan activar notificaciones sin haber puesto el país
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
('es', 'inicio', 'push_country_required', 'Escribí tu país antes de activar las notificaciones'),
('en', 'inicio', 'push_country_required', 'Enter your country before turning on notifications'),
('pt', 'inicio', 'push_country_required', 'Digite seu país antes de ativar as notificações')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
