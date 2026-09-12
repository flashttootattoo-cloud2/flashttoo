-- Traducciones ES/EN/PT para el registro de marcas por invitación
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES

('es', 'ingresar', 'sponsor_invite_title', 'Registro por invitación'),
('es', 'ingresar', 'sponsor_invite_desc',  'El registro de marcas es solo por invitación. Pedile un link a Flashttoo.'),

('en', 'ingresar', 'sponsor_invite_title', 'Invitation-only registration'),
('en', 'ingresar', 'sponsor_invite_desc',  'Brand registration is invitation-only. Ask Flashttoo for a link.'),

('pt', 'ingresar', 'sponsor_invite_title', 'Cadastro por convite'),
('pt', 'ingresar', 'sponsor_invite_desc',  'O cadastro de marcas é somente por convite. Peça um link para a Flashttoo.')

ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
