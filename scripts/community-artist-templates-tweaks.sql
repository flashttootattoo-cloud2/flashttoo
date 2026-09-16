-- Ajustes a los mensajes predeterminados de tatuadores:
-- - "Día de flash" pasa a llamarse "Flash day" (fecha ahora es propia de esa
--   opción, "Diseño disponible" ya no la pide)
-- - "Lienzo para probar diseño" ahora dice lo mismo en el chip y en el mensaje
-- - "Cover-up" se reemplaza por "Busco lienzo para realizar tatuaje en convención"
-- - "Feria" se saca de Evento (código actualizado, esta parte es solo por
--   prolijidad, las filas viejas quedan sin uso)
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
('es', 'comunidad', 'tpl_flash_day', 'Flash day'),
('en', 'comunidad', 'tpl_flash_day', 'Flash day'),
('pt', 'comunidad', 'tpl_flash_day', 'Flash day'),

('es', 'comunidad', 'tpl_flash_day_phrase', 'Flash day disponible'),
('en', 'comunidad', 'tpl_flash_day_phrase', 'Flash day available'),
('pt', 'comunidad', 'tpl_flash_day_phrase', 'Flash day disponível'),

('es', 'comunidad', 'tpl_looking_canvas', 'Busco lienzo para probar diseño'),
('en', 'comunidad', 'tpl_looking_canvas', 'Looking for canvas to try a design'),
('pt', 'comunidad', 'tpl_looking_canvas', 'Procuro pele para testar desenho'),

('es', 'comunidad', 'tpl_looking_canvas_phrase', 'Busco lienzo para probar diseño'),
('en', 'comunidad', 'tpl_looking_canvas_phrase', 'Looking for canvas to try a design'),
('pt', 'comunidad', 'tpl_looking_canvas_phrase', 'Procuro pele para testar desenho'),

('es', 'comunidad', 'tpl_looking_convention', 'Busco lienzo para realizar tatuaje en convención'),
('en', 'comunidad', 'tpl_looking_convention', 'Looking for canvas to tattoo at a convention'),
('pt', 'comunidad', 'tpl_looking_convention', 'Procuro pele para tatuar em convenção'),

('es', 'comunidad', 'tpl_looking_convention_phrase', 'Busco lienzo para realizar tatuaje en convención'),
('en', 'comunidad', 'tpl_looking_convention_phrase', 'Looking for canvas to tattoo at a convention'),
('pt', 'comunidad', 'tpl_looking_convention_phrase', 'Procuro pele para tatuar em convenção')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
