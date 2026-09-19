-- Simplifica los textos de explicación del toggle de notificaciones
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
('es', 'inicio', 'push_country_note', 'Te avisamos cuando un tatuador de tu país publique algo nuevo.'),
('en', 'inicio', 'push_country_note', 'We''ll notify you when a tattoo artist from your country posts something new.'),
('pt', 'inicio', 'push_country_note', 'Avisamos quando um tatuador do seu país publicar algo novo.'),

('es', 'inicio', 'push_install_note', 'En el celular, instalá la app para recibirlas.'),
('en', 'inicio', 'push_install_note', 'On mobile, install the app to receive them.'),
('pt', 'inicio', 'push_install_note', 'No celular, instale o app para recebê-las.')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
