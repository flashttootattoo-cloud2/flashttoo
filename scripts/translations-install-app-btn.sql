-- Botón "Instalar app" junto al aviso de notificaciones
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
('es', 'inicio', 'install_app_btn', 'Instalar app'),
('en', 'inicio', 'install_app_btn', 'Install app'),
('pt', 'inicio', 'install_app_btn', 'Instalar app')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
