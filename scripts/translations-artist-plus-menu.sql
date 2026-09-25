-- Textos del botón "+" del compositor simple de News para tatuadores
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
('es', 'comunidad', 'plus_attach', 'Adjuntar'),
('en', 'comunidad', 'plus_attach', 'Attach'),
('pt', 'comunidad', 'plus_attach', 'Anexar'),

('es', 'comunidad', 'plus_flashbook', 'Adjuntar flashbook'),
('en', 'comunidad', 'plus_flashbook', 'Attach flashbook'),
('pt', 'comunidad', 'plus_flashbook', 'Anexar flashbook'),

('es', 'comunidad', 'plus_turnos', 'Adjuntar turnos libres'),
('en', 'comunidad', 'plus_turnos', 'Attach open slots'),
('pt', 'comunidad', 'plus_turnos', 'Anexar horários livres'),

('es', 'comunidad', 'plus_photo', 'Adjuntar foto'),
('en', 'comunidad', 'plus_photo', 'Attach photo'),
('pt', 'comunidad', 'plus_photo', 'Anexar foto'),

('es', 'comunidad', 'plus_photo_change', 'Cambiar foto'),
('en', 'comunidad', 'plus_photo_change', 'Change photo'),
('pt', 'comunidad', 'plus_photo_change', 'Trocar foto'),

('es', 'comunidad', 'plus_flashbook_chip', 'Flashbook'),
('en', 'comunidad', 'plus_flashbook_chip', 'Flashbook'),
('pt', 'comunidad', 'plus_flashbook_chip', 'Flashbook'),

('es', 'comunidad', 'plus_turnos_chip', 'Turnos libres'),
('en', 'comunidad', 'plus_turnos_chip', 'Open slots'),
('pt', 'comunidad', 'plus_turnos_chip', 'Horários livres')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
