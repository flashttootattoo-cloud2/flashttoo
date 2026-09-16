-- Separa fecha (con calendario) de lugar (texto) en viaje/evento, y ajusta
-- los textos de los placeholders que ya no incluyen "y fechas"
-- Ejecutar en Supabase SQL Editor (después de community-artist-templates-migration.sql)

INSERT INTO translations (language_code, section, key, value) VALUES
-- Viaje: ahora el lugar y la fecha son campos separados
('es', 'comunidad', 'tpl_travel_extra', 'Ciudad y país'),
('en', 'comunidad', 'tpl_travel_extra', 'City and country'),
('pt', 'comunidad', 'tpl_travel_extra', 'Cidade e país'),

('es', 'comunidad', 'tpl_travel_date', 'Fecha (opcional)'),
('en', 'comunidad', 'tpl_travel_date', 'Date (optional)'),
('pt', 'comunidad', 'tpl_travel_date', 'Data (opcional)'),

-- Evento: idem, lugar y fecha separados
('es', 'comunidad', 'tpl_event_extra', 'Lugar (opcional)'),
('en', 'comunidad', 'tpl_event_extra', 'Place (optional)'),
('pt', 'comunidad', 'tpl_event_extra', 'Local (opcional)'),

('es', 'comunidad', 'tpl_event_date', 'Fecha (opcional)'),
('en', 'comunidad', 'tpl_event_date', 'Date (optional)'),
('pt', 'comunidad', 'tpl_event_date', 'Data (opcional)'),

-- Pausa: el placeholder del calendario ya no lleva "..."
('es', 'comunidad', 'tpl_pause_extra', 'Vuelvo el (opcional)'),
('en', 'comunidad', 'tpl_pause_extra', 'Back on (optional)'),
('pt', 'comunidad', 'tpl_pause_extra', 'Volto no dia (opcional)'),

-- Prefijo que se agrega antes de la fecha de vuelta en el mensaje armado
('es', 'comunidad', 'tpl_pause_return_prefix', 'Vuelvo el'),
('en', 'comunidad', 'tpl_pause_return_prefix', 'Back on'),
('pt', 'comunidad', 'tpl_pause_return_prefix', 'Volto no dia')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
