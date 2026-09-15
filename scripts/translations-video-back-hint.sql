-- Aviso al tocar "atrás" con el video de portada abierto — no cierra nada,
-- es solo para desalentar y que usen la X
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
('es', 'cultura', 'video_back_hint', 'Tocá de nuevo para salir'),
('en', 'cultura', 'video_back_hint', 'Tap again to exit'),
('pt', 'cultura', 'video_back_hint', 'Toque novamente para sair')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
