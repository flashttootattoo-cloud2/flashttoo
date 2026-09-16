-- Mensajes predeterminados para tatuadores (categoría → subcategoría, con
-- foto opcional comprimida y subida a R2) + traducciones EN/PT
-- Ejecutar en Supabase SQL Editor

ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS photo_url text;

INSERT INTO translations (language_code, section, key, value) VALUES
-- Generales
('es', 'comunidad', 'mode_template', 'Plantilla rápida'),
('en', 'comunidad', 'mode_template', 'Quick template'),
('pt', 'comunidad', 'mode_template', 'Modelo rápido'),

('es', 'comunidad', 'mode_free', 'Texto libre'),
('en', 'comunidad', 'mode_free', 'Free text'),
('pt', 'comunidad', 'mode_free', 'Texto livre'),

('es', 'comunidad', 'tpl_category_label', 'Categoría'),
('en', 'comunidad', 'tpl_category_label', 'Category'),
('pt', 'comunidad', 'tpl_category_label', 'Categoria'),

('es', 'comunidad', 'tpl_subcat_label', 'Elegí una opción'),
('en', 'comunidad', 'tpl_subcat_label', 'Pick an option'),
('pt', 'comunidad', 'tpl_subcat_label', 'Escolha uma opção'),

('es', 'comunidad', 'tpl_preview_empty', 'Elegí una categoría para armar el mensaje...'),
('en', 'comunidad', 'tpl_preview_empty', 'Pick a category to build the message...'),
('pt', 'comunidad', 'tpl_preview_empty', 'Escolha uma categoria para montar a mensagem...'),

('es', 'comunidad', 'tpl_photo_add', '+ Agregar foto'),
('en', 'comunidad', 'tpl_photo_add', '+ Add photo'),
('pt', 'comunidad', 'tpl_photo_add', '+ Adicionar foto'),

('es', 'comunidad', 'tpl_photo_loading', 'Procesando...'),
('en', 'comunidad', 'tpl_photo_loading', 'Processing...'),
('pt', 'comunidad', 'tpl_photo_loading', 'Processando...'),

('es', 'comunidad', 'tpl_photo_error', 'No se pudo procesar la foto, probá con otra'),
('en', 'comunidad', 'tpl_photo_error', 'Couldn''t process the photo, try another one'),
('pt', 'comunidad', 'tpl_photo_error', 'Não foi possível processar a foto, tente outra'),

-- Categorías
('es', 'comunidad', 'tpl_cat_availability', 'Disponibilidad'),
('en', 'comunidad', 'tpl_cat_availability', 'Availability'),
('pt', 'comunidad', 'tpl_cat_availability', 'Disponibilidade'),

('es', 'comunidad', 'tpl_cat_flash', 'Flash'),
('en', 'comunidad', 'tpl_cat_flash', 'Flash'),
('pt', 'comunidad', 'tpl_cat_flash', 'Flash'),

('es', 'comunidad', 'tpl_cat_looking', 'Busco'),
('en', 'comunidad', 'tpl_cat_looking', 'Looking for'),
('pt', 'comunidad', 'tpl_cat_looking', 'Procuro'),

('es', 'comunidad', 'tpl_cat_travel', 'Viaje'),
('en', 'comunidad', 'tpl_cat_travel', 'Travel'),
('pt', 'comunidad', 'tpl_cat_travel', 'Viagem'),

('es', 'comunidad', 'tpl_cat_studio', 'Estudio'),
('en', 'comunidad', 'tpl_cat_studio', 'Studio'),
('pt', 'comunidad', 'tpl_cat_studio', 'Estúdio'),

('es', 'comunidad', 'tpl_cat_event', 'Evento'),
('en', 'comunidad', 'tpl_cat_event', 'Event'),
('pt', 'comunidad', 'tpl_cat_event', 'Evento'),

('es', 'comunidad', 'tpl_cat_portfolio', 'Portfolio'),
('en', 'comunidad', 'tpl_cat_portfolio', 'Portfolio'),
('pt', 'comunidad', 'tpl_cat_portfolio', 'Portfólio'),

('es', 'comunidad', 'tpl_cat_pause', 'Pausa'),
('en', 'comunidad', 'tpl_cat_pause', 'Pause'),
('pt', 'comunidad', 'tpl_cat_pause', 'Pausa'),

-- Subcategorías (labels)
('es', 'comunidad', 'tpl_avail_week', 'Turnos libres esta semana'),
('en', 'comunidad', 'tpl_avail_week', 'Open slots this week'),
('pt', 'comunidad', 'tpl_avail_week', 'Horários livres esta semana'),

('es', 'comunidad', 'tpl_avail_month', 'Turnos libres este mes'),
('en', 'comunidad', 'tpl_avail_month', 'Open slots this month'),
('pt', 'comunidad', 'tpl_avail_month', 'Horários livres este mês'),

('es', 'comunidad', 'tpl_flash_day', 'Día de flash'),
('en', 'comunidad', 'tpl_flash_day', 'Flash day'),
('pt', 'comunidad', 'tpl_flash_day', 'Dia de flash'),

('es', 'comunidad', 'tpl_flash_design', 'Diseño disponible'),
('en', 'comunidad', 'tpl_flash_design', 'Design available'),
('pt', 'comunidad', 'tpl_flash_design', 'Desenho disponível'),

('es', 'comunidad', 'tpl_looking_canvas', 'Lienzo para probar diseño'),
('en', 'comunidad', 'tpl_looking_canvas', 'Canvas to try a design'),
('pt', 'comunidad', 'tpl_looking_canvas', 'Pele para testar desenho'),

('es', 'comunidad', 'tpl_looking_coverup', 'Cover-up'),
('en', 'comunidad', 'tpl_looking_coverup', 'Cover-up'),
('pt', 'comunidad', 'tpl_looking_coverup', 'Cover-up'),

('es', 'comunidad', 'tpl_travel_guest', 'Voy a tu ciudad'),
('en', 'comunidad', 'tpl_travel_guest', 'Coming to your city'),
('pt', 'comunidad', 'tpl_travel_guest', 'Vou para sua cidade'),

('es', 'comunidad', 'tpl_studio_change', 'Cambio de estudio'),
('en', 'comunidad', 'tpl_studio_change', 'Studio change'),
('pt', 'comunidad', 'tpl_studio_change', 'Mudança de estúdio'),

('es', 'comunidad', 'tpl_studio_address', 'Nueva dirección'),
('en', 'comunidad', 'tpl_studio_address', 'New address'),
('pt', 'comunidad', 'tpl_studio_address', 'Novo endereço'),

('es', 'comunidad', 'tpl_event_convention', 'Convención'),
('en', 'comunidad', 'tpl_event_convention', 'Convention'),
('pt', 'comunidad', 'tpl_event_convention', 'Convenção'),

('es', 'comunidad', 'tpl_event_fair', 'Feria'),
('en', 'comunidad', 'tpl_event_fair', 'Fair'),
('pt', 'comunidad', 'tpl_event_fair', 'Feira'),

('es', 'comunidad', 'tpl_portfolio_new', 'Trabajo nuevo'),
('en', 'comunidad', 'tpl_portfolio_new', 'New work'),
('pt', 'comunidad', 'tpl_portfolio_new', 'Trabalho novo'),

('es', 'comunidad', 'tpl_pause_vacation', 'Vacaciones'),
('en', 'comunidad', 'tpl_pause_vacation', 'Vacation'),
('pt', 'comunidad', 'tpl_pause_vacation', 'Férias'),

('es', 'comunidad', 'tpl_pause_closed', 'Cierre temporal'),
('en', 'comunidad', 'tpl_pause_closed', 'Temporary closure'),
('pt', 'comunidad', 'tpl_pause_closed', 'Fechamento temporário'),

-- Frases que arman el mensaje
('es', 'comunidad', 'tpl_avail_week_phrase', 'Tengo turnos libres esta semana'),
('en', 'comunidad', 'tpl_avail_week_phrase', 'I have open slots this week'),
('pt', 'comunidad', 'tpl_avail_week_phrase', 'Tenho horários livres esta semana'),

('es', 'comunidad', 'tpl_avail_month_phrase', 'Tengo turnos libres este mes'),
('en', 'comunidad', 'tpl_avail_month_phrase', 'I have open slots this month'),
('pt', 'comunidad', 'tpl_avail_month_phrase', 'Tenho horários livres este mês'),

('es', 'comunidad', 'tpl_flash_day_phrase', 'Día de flash disponible'),
('en', 'comunidad', 'tpl_flash_day_phrase', 'Flash day available'),
('pt', 'comunidad', 'tpl_flash_day_phrase', 'Dia de flash disponível'),

('es', 'comunidad', 'tpl_flash_design_phrase', 'Tengo un diseño disponible para tatuar'),
('en', 'comunidad', 'tpl_flash_design_phrase', 'I have a design available to tattoo'),
('pt', 'comunidad', 'tpl_flash_design_phrase', 'Tenho um desenho disponível para tatuar'),

('es', 'comunidad', 'tpl_looking_canvas_phrase', 'Busco piel para probar un diseño nuevo'),
('en', 'comunidad', 'tpl_looking_canvas_phrase', 'Looking for skin to try a new design'),
('pt', 'comunidad', 'tpl_looking_canvas_phrase', 'Procuro pele para testar um desenho novo'),

('es', 'comunidad', 'tpl_looking_coverup_phrase', 'Tengo cupo para un cover-up'),
('en', 'comunidad', 'tpl_looking_coverup_phrase', 'I have room for a cover-up'),
('pt', 'comunidad', 'tpl_looking_coverup_phrase', 'Tenho vaga para um cover-up'),

('es', 'comunidad', 'tpl_travel_guest_phrase', 'Voy a estar tatuando en'),
('en', 'comunidad', 'tpl_travel_guest_phrase', 'I''ll be tattooing in'),
('pt', 'comunidad', 'tpl_travel_guest_phrase', 'Vou estar tatuando em'),

('es', 'comunidad', 'tpl_studio_change_phrase', 'Cambié de estudio'),
('en', 'comunidad', 'tpl_studio_change_phrase', 'I changed studios'),
('pt', 'comunidad', 'tpl_studio_change_phrase', 'Mudei de estúdio'),

('es', 'comunidad', 'tpl_studio_address_phrase', 'Nueva dirección de trabajo'),
('en', 'comunidad', 'tpl_studio_address_phrase', 'New work address'),
('pt', 'comunidad', 'tpl_studio_address_phrase', 'Novo endereço de trabalho'),

('es', 'comunidad', 'tpl_event_convention_phrase', 'Voy a estar en una convención'),
('en', 'comunidad', 'tpl_event_convention_phrase', 'I''ll be at a convention'),
('pt', 'comunidad', 'tpl_event_convention_phrase', 'Vou estar em uma convenção'),

('es', 'comunidad', 'tpl_event_fair_phrase', 'Voy a estar en una feria'),
('en', 'comunidad', 'tpl_event_fair_phrase', 'I''ll be at a fair'),
('pt', 'comunidad', 'tpl_event_fair_phrase', 'Vou estar em uma feira'),

('es', 'comunidad', 'tpl_portfolio_new_phrase', 'Subí un trabajo nuevo'),
('en', 'comunidad', 'tpl_portfolio_new_phrase', 'Uploaded new work'),
('pt', 'comunidad', 'tpl_portfolio_new_phrase', 'Publiquei um trabalho novo'),

('es', 'comunidad', 'tpl_pause_vacation_phrase', 'Estoy de vacaciones'),
('en', 'comunidad', 'tpl_pause_vacation_phrase', 'I''m on vacation'),
('pt', 'comunidad', 'tpl_pause_vacation_phrase', 'Estou de férias'),

('es', 'comunidad', 'tpl_pause_closed_phrase', 'Cierre temporal del estudio'),
('en', 'comunidad', 'tpl_pause_closed_phrase', 'Temporary studio closure'),
('pt', 'comunidad', 'tpl_pause_closed_phrase', 'Fechamento temporário do estúdio'),

-- Placeholders de los campos extra (fecha/lugar como texto libre)
('es', 'comunidad', 'tpl_flash_extra', 'Fecha (opcional)'),
('en', 'comunidad', 'tpl_flash_extra', 'Date (optional)'),
('pt', 'comunidad', 'tpl_flash_extra', 'Data (opcional)'),

('es', 'comunidad', 'tpl_travel_extra', 'Ciudad, país y fechas'),
('en', 'comunidad', 'tpl_travel_extra', 'City, country and dates'),
('pt', 'comunidad', 'tpl_travel_extra', 'Cidade, país e datas'),

('es', 'comunidad', 'tpl_studio_extra', 'Dirección o ciudad (opcional)'),
('en', 'comunidad', 'tpl_studio_extra', 'Address or city (optional)'),
('pt', 'comunidad', 'tpl_studio_extra', 'Endereço ou cidade (opcional)'),

('es', 'comunidad', 'tpl_event_extra', 'Lugar y fecha (opcional)'),
('en', 'comunidad', 'tpl_event_extra', 'Place and date (optional)'),
('pt', 'comunidad', 'tpl_event_extra', 'Local e data (opcional)'),

('es', 'comunidad', 'tpl_pause_extra', 'Vuelvo el... (opcional)'),
('en', 'comunidad', 'tpl_pause_extra', 'Back on... (optional)'),
('pt', 'comunidad', 'tpl_pause_extra', 'Volto no dia... (opcional)')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
