-- Nuevo tipo de post "news" — información/novedades curadas por el admin
-- (ej. compartir el flash day de un estudio visto en Instagram), separado
-- visualmente de los mensajes "Oficial" de Flashttoo
-- Ejecutar en Supabase SQL Editor

ALTER TABLE community_posts DROP CONSTRAINT IF EXISTS community_posts_type_check;
ALTER TABLE community_posts ADD CONSTRAINT community_posts_type_check
  CHECK (type IN ('artist', 'studio', 'sponsor', 'client', 'admin', 'search', 'news'));
