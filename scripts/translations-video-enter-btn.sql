-- Botón chico "Entrar" con el logo, afuera de la tarjeta del video de
-- portada — otra forma obvia de entrar, además de la X
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
('es', 'cultura', 'video_enter_btn', 'Entrar'),
('en', 'cultura', 'video_enter_btn', 'Enter'),
('pt', 'cultura', 'video_enter_btn', 'Entrar')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
