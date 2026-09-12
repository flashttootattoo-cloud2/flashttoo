-- Traducciones ES/EN/PT para el registro de estudios por invitación
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES

('es', 'ingresar', 'studio_invite_title', 'Registro por invitación'),
('es', 'ingresar', 'studio_invite_desc',  'El registro de estudios es solo por invitación. Pedile un link a Flashttoo.'),

('en', 'ingresar', 'studio_invite_title', 'Invitation-only registration'),
('en', 'ingresar', 'studio_invite_desc',  'Studio registration is invitation-only. Ask Flashttoo for a link.'),

('pt', 'ingresar', 'studio_invite_title', 'Cadastro por convite'),
('pt', 'ingresar', 'studio_invite_desc',  'O cadastro de estúdios é somente por convite. Peça um link para a Flashttoo.')

ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
