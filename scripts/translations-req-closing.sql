-- Cuarto chip "Cierre" para el pedido de cliente en comunidad — le da
-- personalidad distinta a cada mensaje e invita al tatuador a responder
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
('es', 'comunidad', 'req_closing_label', 'Cierre (opcional)'),
('en', 'comunidad', 'req_closing_label', 'Closing (optional)'),
('pt', 'comunidad', 'req_closing_label', 'Encerramento (opcional)'),

-- Labels cortos de los chips
('es', 'comunidad', 'req_closing_contact_label', 'Directo'),
('en', 'comunidad', 'req_closing_contact_label', 'Direct'),
('pt', 'comunidad', 'req_closing_contact_label', 'Direto'),

('es', 'comunidad', 'req_closing_hype_label', 'Con onda'),
('en', 'comunidad', 'req_closing_hype_label', 'Fun'),
('pt', 'comunidad', 'req_closing_hype_label', 'Descontraído'),

('es', 'comunidad', 'req_closing_open_label', 'Abierto'),
('en', 'comunidad', 'req_closing_open_label', 'Open'),
('pt', 'comunidad', 'req_closing_open_label', 'Aberto'),

('es', 'comunidad', 'req_closing_simple_label', 'Simple'),
('en', 'comunidad', 'req_closing_simple_label', 'Simple'),
('pt', 'comunidad', 'req_closing_simple_label', 'Simples'),

-- Frase que se agrega al final del mensaje
('es', 'comunidad', 'req_closing_contact', 'Dejame tu perfil acá abajo que te contacto'),
('en', 'comunidad', 'req_closing_contact', 'Leave your profile below and I''ll reach out'),
('pt', 'comunidad', 'req_closing_contact', 'Deixe seu perfil aqui embaixo que eu entro em contato'),

('es', 'comunidad', 'req_closing_hype', 'Que le metemos tinta'),
('en', 'comunidad', 'req_closing_hype', 'Let''s get some ink going'),
('pt', 'comunidad', 'req_closing_hype', 'Bora colocar tinta'),

('es', 'comunidad', 'req_closing_open', 'El que se anime, que avise'),
('en', 'comunidad', 'req_closing_open', 'Whoever''s up for it, let me know'),
('pt', 'comunidad', 'req_closing_open', 'Quem topar, avisa'),

('es', 'comunidad', 'req_closing_simple', 'Cualquier tatuador interesado, gracias'),
('en', 'comunidad', 'req_closing_simple', 'Any interested artist, thank you'),
('pt', 'comunidad', 'req_closing_simple', 'Qualquer tatuador interessado, obrigado')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
