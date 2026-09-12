-- "Pedido Flash": widget que las marcas pueden adjuntar a un mensaje de comunidad
-- con una lista corta de ítems (nombre + precio) para armar un pedido por WhatsApp.
-- Ejecutar en Supabase SQL Editor

ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS offer_items jsonb;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS sponsor_whatsapp text;
