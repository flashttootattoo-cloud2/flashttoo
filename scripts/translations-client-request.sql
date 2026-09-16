-- Textos del nuevo flujo "Busco tattoo artist" en comunidad (clientes no logueados)
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
-- Botón que abre el modal / título del modal
('es', 'comunidad', 'req_open_btn', 'Busco tattoo artist'),
('en', 'comunidad', 'req_open_btn', 'Looking for a tattoo artist'),
('pt', 'comunidad', 'req_open_btn', 'Procuro um tatuador'),

('es', 'comunidad', 'req_title', 'Busco tattoo artist'),
('en', 'comunidad', 'req_title', 'Looking for a tattoo artist'),
('pt', 'comunidad', 'req_title', 'Procuro um tatuador'),

-- Base de la frase armada
('es', 'comunidad', 'req_base', 'Busco tattoo artist'),
('en', 'comunidad', 'req_base', 'Looking for a tattoo artist'),
('pt', 'comunidad', 'req_base', 'Procuro um tatuador'),

-- Etiquetas de sección
('es', 'comunidad', 'req_purpose_label', '¿Para qué?'),
('en', 'comunidad', 'req_purpose_label', 'What for?'),
('pt', 'comunidad', 'req_purpose_label', 'Para quê?'),

('es', 'comunidad', 'req_style_label', 'Estilo (opcional)'),
('en', 'comunidad', 'req_style_label', 'Style (optional)'),
('pt', 'comunidad', 'req_style_label', 'Estilo (opcional)'),

('es', 'comunidad', 'req_timing_label', '¿Cuándo? (opcional)'),
('en', 'comunidad', 'req_timing_label', 'When? (optional)'),
('pt', 'comunidad', 'req_timing_label', 'Quando? (opcional)'),

('es', 'comunidad', 'req_style_prefix', 'estilo'),
('en', 'comunidad', 'req_style_prefix', 'style'),
('pt', 'comunidad', 'req_style_prefix', 'estilo'),

-- "¿Para qué?" — labels de los chips
('es', 'comunidad', 'req_purpose_next_label', 'Mi próximo tattoo'),
('en', 'comunidad', 'req_purpose_next_label', 'My next tattoo'),
('pt', 'comunidad', 'req_purpose_next_label', 'Minha próxima tattoo'),

('es', 'comunidad', 'req_purpose_coverup_label', 'Cover up'),
('en', 'comunidad', 'req_purpose_coverup_label', 'Cover up'),
('pt', 'comunidad', 'req_purpose_coverup_label', 'Cover up'),

('es', 'comunidad', 'req_purpose_full_label', 'Pieza completa'),
('en', 'comunidad', 'req_purpose_full_label', 'Full piece'),
('pt', 'comunidad', 'req_purpose_full_label', 'Peça completa'),

('es', 'comunidad', 'req_purpose_patch_label', 'Parche'),
('en', 'comunidad', 'req_purpose_patch_label', 'Small tattoo'),
('pt', 'comunidad', 'req_purpose_patch_label', 'Tatuagem pequena'),

-- "¿Para qué?" — frase que se arma dentro del mensaje
('es', 'comunidad', 'req_purpose_next', 'para mi próximo tattoo'),
('en', 'comunidad', 'req_purpose_next', 'for my next tattoo'),
('pt', 'comunidad', 'req_purpose_next', 'para minha próxima tattoo'),

('es', 'comunidad', 'req_purpose_coverup', 'para un cover up'),
('en', 'comunidad', 'req_purpose_coverup', 'for a cover up'),
('pt', 'comunidad', 'req_purpose_coverup', 'para um cover up'),

('es', 'comunidad', 'req_purpose_full', 'para tatuarme una pieza completa'),
('en', 'comunidad', 'req_purpose_full', 'for a full piece'),
('pt', 'comunidad', 'req_purpose_full', 'para uma peça completa'),

('es', 'comunidad', 'req_purpose_patch', 'para tatuarme un parche'),
('en', 'comunidad', 'req_purpose_patch', 'for a small tattoo'),
('pt', 'comunidad', 'req_purpose_patch', 'para uma tatuagem pequena'),

-- "¿Cuándo?" — labels de los chips
('es', 'comunidad', 'req_timing_week_label', 'Esta semana'),
('en', 'comunidad', 'req_timing_week_label', 'This week'),
('pt', 'comunidad', 'req_timing_week_label', 'Esta semana'),

('es', 'comunidad', 'req_timing_month_label', 'Este mes'),
('en', 'comunidad', 'req_timing_month_label', 'This month'),
('pt', 'comunidad', 'req_timing_month_label', 'Este mês'),

('es', 'comunidad', 'req_timing_nohurry_label', 'Sin apuro'),
('en', 'comunidad', 'req_timing_nohurry_label', 'No rush'),
('pt', 'comunidad', 'req_timing_nohurry_label', 'Sem pressa'),

-- "¿Cuándo?" — frase que se arma dentro del mensaje
('es', 'comunidad', 'req_timing_week', 'para esta semana'),
('en', 'comunidad', 'req_timing_week', 'for this week'),
('pt', 'comunidad', 'req_timing_week', 'para esta semana'),

('es', 'comunidad', 'req_timing_month', 'para este mes'),
('en', 'comunidad', 'req_timing_month', 'for this month'),
('pt', 'comunidad', 'req_timing_month', 'para este mês'),

('es', 'comunidad', 'req_timing_nohurry', 'sin apuro'),
('en', 'comunidad', 'req_timing_nohurry', 'no rush'),
('pt', 'comunidad', 'req_timing_nohurry', 'sem pressa'),

-- Genéricos (por si no existían ya en esta sección)
('es', 'comunidad', 'continue', 'Continuar'),
('en', 'comunidad', 'continue', 'Continue'),
('pt', 'comunidad', 'continue', 'Continuar'),

('es', 'comunidad', 'edit', 'Editar'),
('en', 'comunidad', 'edit', 'Edit'),
('pt', 'comunidad', 'edit', 'Editar')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
