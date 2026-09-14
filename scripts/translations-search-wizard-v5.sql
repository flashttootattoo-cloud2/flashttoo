-- Aviso ampliado: aclara que no hay notificaciones, el cliente tiene que volver
-- a buscar su propio mensaje en comunidad para ver si algún tatuador respondió
-- Ejecutar en Supabase SQL Editor

UPDATE translations SET value = 'Esto se publica en la comunidad — tatuadores de tu zona lo van a ver y pueden querer ayudarte. Después volvé y buscá el mensaje para ver qué tatuador puede tener disponibilidad.'
WHERE section = 'buscador' AND key = 'describe_community_hint' AND language_code = 'es';

INSERT INTO translations (language_code, section, key, value) VALUES
('en', 'buscador', 'describe_community_hint', 'This gets posted in the community — artists near you will see it and might want to help. Come back later and look for the message to see which artist may be available.'),
('pt', 'buscador', 'describe_community_hint', 'Isso é publicado na comunidade — tatuadores da sua região vão ver e podem querer te ajudar. Depois volte e procure a mensagem para ver qual tatuador pode estar disponível.')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
