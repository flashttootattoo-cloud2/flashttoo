-- Textos para el nuevo apartado "Noticias / Info" en comunidad
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
('es', 'comunidad', 'badge_news', 'Novedades'),
('en', 'comunidad', 'badge_news', 'News'),
('pt', 'comunidad', 'badge_news', 'Novidades'),

('es', 'comunidad', 'badge_news_tag', 'Novedad'),
('en', 'comunidad', 'badge_news_tag', 'News'),
('pt', 'comunidad', 'badge_news_tag', 'Novidade')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
