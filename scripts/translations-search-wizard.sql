-- Traducciones ES/EN/PT para el "Asistente de búsqueda" (SearchWizardModal + BodyMapModal)
-- y las etiquetas nuevas en comunidad para el tipo de post "search".
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES

-- ==========================================
-- ESPAÑOL (base)
-- ==========================================
('es', 'buscador', 'headline',        '¿Qué tatuaje estás buscando?'),
('es', 'buscador', 'subheadline',     'Te mostramos tatuadores según lo que elijas. Todo opcional, menos el país.'),
('es', 'buscador', 'continue',        'Continuar'),
('es', 'buscador', 'search_now',      'Buscar'),
('es', 'buscador', 'cat_parche',      'Parche'),
('es', 'buscador', 'cat_parche_hint', 'Algo chico y puntual'),
('es', 'buscador', 'cat_pieza',       'Pieza más completa'),
('es', 'buscador', 'cat_pieza_hint',  'Algo grande o elaborado'),
('es', 'buscador', 'size_chico',      'Chico'),
('es', 'buscador', 'size_mediano',    'Mediano'),
('es', 'buscador', 'size_grande',     'Grande'),
('es', 'buscador', 'open_body_map',   '🗺 Elegir con más precisión'),
('es', 'buscador', 'no_style',        'No tengo definido'),
('es', 'buscador', 'contact_hint',    'Opcional: dejá tu contacto para que un tatuador te escriba.'),
('es', 'buscador', 'search_cta',      'Buscar tatuadores'),
('es', 'buscador', 'msg_detailed',    'Alguien busca {detail} — {loc}'),
('es', 'buscador', 'msg_basic',       'Alguien buscó tatuadores en {loc}'),
('es', 'buscador', 'reopen_button',   '¿Qué estás buscando?'),
('es', 'buscador', 'body_map_title',  'Elegí la zona'),
('es', 'buscador', 'view_front',      'Frente'),
('es', 'buscador', 'view_back',       'Espalda'),
('es', 'buscador', 'body_map_done',   'Listo'),
('es', 'comunidad', 'search_someone', 'Alguien'),
('es', 'comunidad', 'badge_search',   'Búsqueda'),

-- ==========================================
-- INGLÉS
-- ==========================================
('en', 'buscador', 'headline',        'What tattoo are you looking for?'),
('en', 'buscador', 'subheadline',     'We''ll show you artists based on what you choose. Everything is optional except the country.'),
('en', 'buscador', 'continue',        'Continue'),
('en', 'buscador', 'search_now',      'Search'),
('en', 'buscador', 'cat_parche',      'Small piece'),
('en', 'buscador', 'cat_parche_hint', 'Something small and simple'),
('en', 'buscador', 'cat_pieza',       'Bigger piece'),
('en', 'buscador', 'cat_pieza_hint',  'Something large or elaborate'),
('en', 'buscador', 'size_chico',      'Small'),
('en', 'buscador', 'size_mediano',    'Medium'),
('en', 'buscador', 'size_grande',     'Large'),
('en', 'buscador', 'open_body_map',   '🗺 Pick a precise spot'),
('en', 'buscador', 'no_style',        'Not sure yet'),
('en', 'buscador', 'contact_hint',    'Optional: leave your contact so an artist can reach out.'),
('en', 'buscador', 'search_cta',      'Search artists'),
('en', 'buscador', 'msg_detailed',    'Someone is looking for {detail} — {loc}'),
('en', 'buscador', 'msg_basic',       'Someone searched for tattoo artists in {loc}'),
('en', 'buscador', 'reopen_button',   'What are you looking for?'),
('en', 'buscador', 'body_map_title',  'Pick the spot'),
('en', 'buscador', 'view_front',      'Front'),
('en', 'buscador', 'view_back',       'Back'),
('en', 'buscador', 'body_map_done',   'Done'),
('en', 'comunidad', 'search_someone', 'Someone'),
('en', 'comunidad', 'badge_search',   'Search'),

-- ==========================================
-- PORTUGUÉS
-- ==========================================
('pt', 'buscador', 'headline',        'Que tatuagem você está procurando?'),
('pt', 'buscador', 'subheadline',     'Mostramos tatuadores de acordo com o que você escolher. Tudo opcional, menos o país.'),
('pt', 'buscador', 'continue',        'Continuar'),
('pt', 'buscador', 'search_now',      'Buscar'),
('pt', 'buscador', 'cat_parche',      'Peça pequena'),
('pt', 'buscador', 'cat_parche_hint', 'Algo pequeno e simples'),
('pt', 'buscador', 'cat_pieza',       'Peça mais completa'),
('pt', 'buscador', 'cat_pieza_hint',  'Algo grande ou elaborado'),
('pt', 'buscador', 'size_chico',      'Pequeno'),
('pt', 'buscador', 'size_mediano',    'Médio'),
('pt', 'buscador', 'size_grande',     'Grande'),
('pt', 'buscador', 'open_body_map',   '🗺 Escolher com mais precisão'),
('pt', 'buscador', 'no_style',        'Ainda não sei'),
('pt', 'buscador', 'contact_hint',    'Opcional: deixe seu contato para um tatuador falar com você.'),
('pt', 'buscador', 'search_cta',      'Buscar tatuadores'),
('pt', 'buscador', 'msg_detailed',    'Alguém está procurando {detail} — {loc}'),
('pt', 'buscador', 'msg_basic',       'Alguém procurou tatuadores em {loc}'),
('pt', 'buscador', 'reopen_button',   'O que você está procurando?'),
('pt', 'buscador', 'body_map_title',  'Escolha o local'),
('pt', 'buscador', 'view_front',      'Frente'),
('pt', 'buscador', 'view_back',       'Costas'),
('pt', 'buscador', 'body_map_done',   'Pronto'),
('pt', 'comunidad', 'search_someone', 'Alguém'),
('pt', 'comunidad', 'badge_search',   'Busca')

ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
