-- Todas las traducciones de registro + notificaciones push, juntas
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
-- Registro
('es', 'ingresar', 'menu_note', 'Armá tu perfil de búsqueda'),
('en', 'ingresar', 'menu_note', 'Set up your profile'),
('pt', 'ingresar', 'menu_note', 'Monte seu perfil'),

('es', 'ingresar', 'register_btn', 'Registro de tatuadores'),
('en', 'ingresar', 'register_btn', 'Tattoo artist registration'),
('pt', 'ingresar', 'register_btn', 'Cadastro de tatuadores'),

-- Toggle de notificaciones (menú de tres puntos)
('es', 'inicio', 'menu_notifications', 'Notificaciones'),
('en', 'inicio', 'menu_notifications', 'Notifications'),
('pt', 'inicio', 'menu_notifications', 'Notificações'),

('es', 'inicio', 'push_country_placeholder', 'Tu país'),
('en', 'inicio', 'push_country_placeholder', 'Your country'),
('pt', 'inicio', 'push_country_placeholder', 'Seu país'),

('es', 'inicio', 'push_country_note', 'Con ese país te avisamos cuando tatuadores de ahí publiquen algo nuevo en comunidad.'),
('en', 'inicio', 'push_country_note', 'We''ll notify you when tattoo artists from that country post something new in the community.'),
('pt', 'inicio', 'push_country_note', 'Com esse país avisamos quando tatuadores de lá publicarem algo novo na comunidade.'),

('es', 'inicio', 'push_install_note', 'En el celular, instalá la app a tu pantalla de inicio para no perderte ninguna novedad.'),
('en', 'inicio', 'push_install_note', 'On mobile, install the app to your home screen so you don''t miss any updates.'),
('pt', 'inicio', 'push_install_note', 'No celular, instale o app na sua tela inicial para não perder nenhuma novidade.'),

('es', 'inicio', 'push_country_required', 'Escribí tu país antes de activar las notificaciones'),
('en', 'inicio', 'push_country_required', 'Enter your country before turning on notifications'),
('pt', 'inicio', 'push_country_required', 'Digite seu país antes de ativar as notificações'),

-- Aviso de foto adjunta que falla al subir
('es', 'comunidad', 'photo_upload_error', 'No se pudo subir la foto, probá de nuevo'),
('en', 'comunidad', 'photo_upload_error', 'Could not upload the photo, try again'),
('pt', 'comunidad', 'photo_upload_error', 'Não foi possível enviar a foto, tente novamente')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
