-- Traducciones para funcionalidad de Turnos Libres
-- Ejecutar en Supabase SQL Editor
-- Secciones: turnos_libres, comunidad (adiciones), artist_menu (adición), disponibilidad

INSERT INTO translations (language_code, section, key, value) VALUES

-- ==========================================
-- ESPAÑOL (base)
-- ==========================================
('es', 'turnos_libres', 'titulo',              'Turnos libres'),
('es', 'turnos_libres', 'ocupados',            'El artista ya ocupó los turnos'),
('es', 'turnos_libres', 'consultar_fechas',    'Consultale directamente para nuevas fechas'),
('es', 'turnos_libres', 'guardar',             'Guardar'),
('es', 'turnos_libres', 'guardando',           'Guardando…'),
('es', 'turnos_libres', 'guardado',            '✓ Guardado'),
('es', 'turnos_libres', 'copiar_link',         'Copiar link'),
('es', 'turnos_libres', 'copiado',             '✓ Copiado'),
('es', 'turnos_libres', 'sin_dias',            'Sin días marcados'),
('es', 'turnos_libres', 'horarios',            'Horarios'),
('es', 'turnos_libres', 'horarios_disponibles','Horarios disponibles'),
('es', 'turnos_libres', 'quitar_dia',          'Quitar día'),
('es', 'turnos_libres', 'dia_disponible',      'día disponible'),
('es', 'turnos_libres', 'dias_disponibles',    'días disponibles'),

('es', 'comunidad', 'turnos_adjuntos',         'Turnos adjuntos'),
('es', 'comunidad', 'adjuntar_turnos',         '+ Adjuntar turnos libres'),
('es', 'comunidad', 'turnos_libres_chip',      'Turnos libres'),

('es', 'artist_menu', 'turnos_libres',         'Turnos libres'),

('es', 'disponibilidad', 'titulo',              'Turnos libres'),
('es', 'disponibilidad', 'disponible',          'Disponible'),
('es', 'disponibilidad', 'ocupado',             'Ocupado'),
('es', 'disponibilidad', 'ver_perfil',          'Ver perfil completo'),
('es', 'disponibilidad', 'sin_turnos',          'Sin turnos cargados por ahora'),
('es', 'disponibilidad', 'consultar_horario',   'Consultar horario'),
('es', 'disponibilidad', 'horarios_disponibles','Horarios disponibles'),
('es', 'disponibilidad', 'artista_no_encontrado','Artista no encontrado'),

-- ==========================================
-- INGLÉS
-- ==========================================
('en', 'turnos_libres', 'titulo',              'Available slots'),
('en', 'turnos_libres', 'ocupados',            'The artist''s slots are taken'),
('en', 'turnos_libres', 'consultar_fechas',    'Contact them directly for new dates'),
('en', 'turnos_libres', 'guardar',             'Save'),
('en', 'turnos_libres', 'guardando',           'Saving…'),
('en', 'turnos_libres', 'guardado',            '✓ Saved'),
('en', 'turnos_libres', 'copiar_link',         'Copy link'),
('en', 'turnos_libres', 'copiado',             '✓ Copied'),
('en', 'turnos_libres', 'sin_dias',            'No days selected'),
('en', 'turnos_libres', 'horarios',            'Schedule'),
('en', 'turnos_libres', 'horarios_disponibles','Available hours'),
('en', 'turnos_libres', 'quitar_dia',          'Remove day'),
('en', 'turnos_libres', 'dia_disponible',      'available day'),
('en', 'turnos_libres', 'dias_disponibles',    'available days'),

('en', 'comunidad', 'turnos_adjuntos',         'Slots attached'),
('en', 'comunidad', 'adjuntar_turnos',         '+ Attach available slots'),
('en', 'comunidad', 'turnos_libres_chip',      'Available slots'),

('en', 'artist_menu', 'turnos_libres',         'Available slots'),

('en', 'disponibilidad', 'titulo',              'Available slots'),
('en', 'disponibilidad', 'disponible',          'Available'),
('en', 'disponibilidad', 'ocupado',             'Booked'),
('en', 'disponibilidad', 'ver_perfil',          'View full profile'),
('en', 'disponibilidad', 'sin_turnos',          'No appointments loaded yet'),
('en', 'disponibilidad', 'consultar_horario',   'Check schedule'),
('en', 'disponibilidad', 'horarios_disponibles','Available hours'),
('en', 'disponibilidad', 'artista_no_encontrado','Artist not found'),

-- ==========================================
-- PORTUGUÉS
-- ==========================================
('pt', 'turnos_libres', 'titulo',              'Horários livres'),
('pt', 'turnos_libres', 'ocupados',            'O artista já ocupou os horários'),
('pt', 'turnos_libres', 'consultar_fechas',    'Entre em contato diretamente para novas datas'),
('pt', 'turnos_libres', 'guardar',             'Salvar'),
('pt', 'turnos_libres', 'guardando',           'Salvando…'),
('pt', 'turnos_libres', 'guardado',            '✓ Salvo'),
('pt', 'turnos_libres', 'copiar_link',         'Copiar link'),
('pt', 'turnos_libres', 'copiado',             '✓ Copiado'),
('pt', 'turnos_libres', 'sin_dias',            'Nenhum dia marcado'),
('pt', 'turnos_libres', 'horarios',            'Horários'),
('pt', 'turnos_libres', 'horarios_disponibles','Horários disponíveis'),
('pt', 'turnos_libres', 'quitar_dia',          'Remover dia'),
('pt', 'turnos_libres', 'dia_disponible',      'dia disponível'),
('pt', 'turnos_libres', 'dias_disponibles',    'dias disponíveis'),

('pt', 'comunidad', 'turnos_adjuntos',         'Horários adjuntos'),
('pt', 'comunidad', 'adjuntar_turnos',         '+ Adjuntar horários livres'),
('pt', 'comunidad', 'turnos_libres_chip',      'Horários livres'),

('pt', 'artist_menu', 'turnos_libres',         'Horários livres'),

('pt', 'disponibilidad', 'titulo',              'Horários livres'),
('pt', 'disponibilidad', 'disponible',          'Disponível'),
('pt', 'disponibilidad', 'ocupado',             'Ocupado'),
('pt', 'disponibilidad', 'ver_perfil',          'Ver perfil completo'),
('pt', 'disponibilidad', 'sin_turnos',          'Nenhum horário carregado'),
('pt', 'disponibilidad', 'consultar_horario',   'Consultar horário'),
('pt', 'disponibilidad', 'horarios_disponibles','Horários disponíveis'),
('pt', 'disponibilidad', 'artista_no_encontrado','Artista não encontrado')

ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
