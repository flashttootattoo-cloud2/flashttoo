-- Ajuste de texto: se saca "acá" de la frase del registro
-- Ejecutar en Supabase SQL Editor

UPDATE translations SET value = 'Armá tu perfil de búsqueda'
WHERE language_code = 'es' AND section = 'ingresar' AND key = 'menu_note';
