-- Nombres de meses — ES / EN / PT
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES

('es','meses','enero','Enero'),
('es','meses','febrero','Febrero'),
('es','meses','marzo','Marzo'),
('es','meses','abril','Abril'),
('es','meses','mayo','Mayo'),
('es','meses','junio','Junio'),
('es','meses','julio','Julio'),
('es','meses','agosto','Agosto'),
('es','meses','septiembre','Septiembre'),
('es','meses','octubre','Octubre'),
('es','meses','noviembre','Noviembre'),
('es','meses','diciembre','Diciembre'),

('en','meses','enero','January'),
('en','meses','febrero','February'),
('en','meses','marzo','March'),
('en','meses','abril','April'),
('en','meses','mayo','May'),
('en','meses','junio','June'),
('en','meses','julio','July'),
('en','meses','agosto','August'),
('en','meses','septiembre','September'),
('en','meses','octubre','October'),
('en','meses','noviembre','November'),
('en','meses','diciembre','December'),

('pt','meses','enero','Janeiro'),
('pt','meses','febrero','Fevereiro'),
('pt','meses','marzo','Março'),
('pt','meses','abril','Abril'),
('pt','meses','mayo','Maio'),
('pt','meses','junio','Junho'),
('pt','meses','julio','Julho'),
('pt','meses','agosto','Agosto'),
('pt','meses','septiembre','Setembro'),
('pt','meses','octubre','Outubro'),
('pt','meses','noviembre','Novembro'),
('pt','meses','diciembre','Dezembro')

ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
