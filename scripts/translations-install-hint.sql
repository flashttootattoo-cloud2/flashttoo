-- Textos del nuevo cartel de instalación (reemplaza al InstallBanner viejo)
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
('es', 'inicio', 'install_hint_title', 'Instalá Flashttoo'),
('en', 'inicio', 'install_hint_title', 'Install Flashttoo'),
('pt', 'inicio', 'install_hint_title', 'Instale o Flashttoo'),

('es', 'inicio', 'install_hint_body_ios', 'Tocá Compartir ⬆️ y elegí "Agregar a inicio" para tenerla como app.'),
('en', 'inicio', 'install_hint_body_ios', 'Tap Share ⬆️ and choose "Add to Home Screen" to use it as an app.'),
('pt', 'inicio', 'install_hint_body_ios', 'Toque em Compartilhar ⬆️ e escolha "Adicionar à Tela de Início".'),

('es', 'inicio', 'install_hint_body_android', 'Tenela como app: acceso directo y notificaciones más rápidas.'),
('en', 'inicio', 'install_hint_body_android', 'Get it as an app: quick access and faster notifications.'),
('pt', 'inicio', 'install_hint_body_android', 'Tenha como app: acesso rápido e notificações mais rápidas.')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
