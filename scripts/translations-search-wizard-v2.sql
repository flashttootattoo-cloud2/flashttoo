-- Traducciones ES/EN/PT para la nueva versión del asistente de búsqueda
-- (preguntas del acordeón + "levantar la mano" en comunidad)
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES

-- ==========================================
-- ESPAÑOL (base)
-- ==========================================
('es', 'buscador', 'q_country',         '¿En qué país estás?'),
('es', 'buscador', 'q_city',            '¿En qué ciudad?'),
('es', 'buscador', 'q_describe',        'Contanos qué te querés tatuar'),
('es', 'buscador', 'q_describe_hint',   'Con tus palabras — podés mencionar tamaño, zona del cuerpo, lo que se te ocurra.'),
('es', 'buscador', 'describe_placeholder', 'ej: una serpiente enroscada en el antebrazo, algo chico'),
('es', 'buscador', 'q_category',        '¿Pieza completa o parche?'),
('es', 'buscador', 'q_size',            '¿Qué tamaño?'),
('es', 'buscador', 'q_style',           '¿Tenés un estilo en mente?'),
('es', 'buscador', 'skip',              'Saltear'),
('es', 'comunidad', 'helpers_title',    'Pueden ayudarte'),
('es', 'comunidad', 'helpers_raise',    '✋ Yo puedo ayudar'),
('es', 'comunidad', 'helpers_lower',    'Ya no puedo ayudar'),
('es', 'comunidad', 'helpers_empty',    'Todavía nadie se ofreció. ¡Sé el primero!'),

-- ==========================================
-- INGLÉS
-- ==========================================
('en', 'buscador', 'q_country',         'What country are you in?'),
('en', 'buscador', 'q_city',            'What city?'),
('en', 'buscador', 'q_describe',        'Tell us what you want to get tattooed'),
('en', 'buscador', 'q_describe_hint',   'In your own words — you can mention size, body placement, whatever comes to mind.'),
('en', 'buscador', 'describe_placeholder', 'e.g: a snake coiled around the forearm, something small'),
('en', 'buscador', 'q_category',        'Full piece or small tattoo?'),
('en', 'buscador', 'q_size',            'What size?'),
('en', 'buscador', 'q_style',           'Do you have a style in mind?'),
('en', 'buscador', 'skip',              'Skip'),
('en', 'comunidad', 'helpers_title',    'Can help you'),
('en', 'comunidad', 'helpers_raise',    '✋ I can help'),
('en', 'comunidad', 'helpers_lower',    'I can''t help anymore'),
('en', 'comunidad', 'helpers_empty',    'No one has offered yet. Be the first!'),

-- ==========================================
-- PORTUGUÉS
-- ==========================================
('pt', 'buscador', 'q_country',         'Em que país você está?'),
('pt', 'buscador', 'q_city',            'Em que cidade?'),
('pt', 'buscador', 'q_describe',        'Nos conte o que você quer tatuar'),
('pt', 'buscador', 'q_describe_hint',   'Com suas palavras — pode mencionar tamanho, local do corpo, o que quiser.'),
('pt', 'buscador', 'describe_placeholder', 'ex: uma cobra enrolada no antebraço, algo pequeno'),
('pt', 'buscador', 'q_category',        'Peça completa ou pequena?'),
('pt', 'buscador', 'q_size',            'Que tamanho?'),
('pt', 'buscador', 'q_style',           'Tem um estilo em mente?'),
('pt', 'buscador', 'skip',              'Pular'),
('pt', 'comunidad', 'helpers_title',    'Podem te ajudar'),
('pt', 'comunidad', 'helpers_raise',    '✋ Eu posso ajudar'),
('pt', 'comunidad', 'helpers_lower',    'Não posso mais ajudar'),
('pt', 'comunidad', 'helpers_empty',    'Ainda ninguém se ofereceu. Seja o primeiro!')

ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
