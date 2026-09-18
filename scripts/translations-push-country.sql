-- Campo de país explícito junto al toggle de notificaciones
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
('es', 'inicio', 'push_country_placeholder', 'Tu país'),
('en', 'inicio', 'push_country_placeholder', 'Your country'),
('pt', 'inicio', 'push_country_placeholder', 'Seu país'),

('es', 'inicio', 'push_country_note', 'Con ese país te avisamos cuando tatuadores de ahí publiquen algo nuevo en comunidad.'),
('en', 'inicio', 'push_country_note', 'We''ll notify you when tattoo artists from that country post something new in the community.'),
('pt', 'inicio', 'push_country_note', 'Com esse país avisamos quando tatuadores de lá publicarem algo novo na comunidade.'),

('es', 'inicio', 'push_install_note', 'En el celular, instalá la app a tu pantalla de inicio para no perderte ninguna novedad.'),
('en', 'inicio', 'push_install_note', 'On mobile, install the app to your home screen so you don''t miss any updates.'),
('pt', 'inicio', 'push_install_note', 'No celular, instale o app na sua tela inicial para não perder nenhuma novidade.')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
