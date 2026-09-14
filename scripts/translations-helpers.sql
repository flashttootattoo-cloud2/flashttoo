-- Textos de la función "Me interesa esta pieza" (tatuadores respondiendo a búsquedas)
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
('es', 'comunidad', 'helpers_title', 'Tatuadores interesados'),
('en', 'comunidad', 'helpers_title', 'Interested artists'),
('pt', 'comunidad', 'helpers_title', 'Tatuadores interessados'),

('es', 'comunidad', 'helpers_empty', 'Todavía nadie se ofreció'),
('en', 'comunidad', 'helpers_empty', 'No one has offered yet'),
('pt', 'comunidad', 'helpers_empty', 'Ainda ninguém se ofereceu'),

('es', 'comunidad', 'help_btn_on', 'Me interesa esta pieza'),
('en', 'comunidad', 'help_btn_on', 'I''m interested in this piece'),
('pt', 'comunidad', 'help_btn_on', 'Tenho interesse nessa peça'),

('es', 'comunidad', 'help_btn_off', 'Ya no me interesa'),
('en', 'comunidad', 'help_btn_off', 'No longer interested'),
('pt', 'comunidad', 'help_btn_off', 'Não tenho mais interesse')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
