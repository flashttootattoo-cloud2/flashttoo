-- Mensaje de perfil en revisión: tatuador recién registrado entra con sesión
-- abierta pero con menú restringido y no puede publicar en comunidad todavía
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
('es', 'comunidad', 'artist_pending', 'Tu perfil todavía está en revisión — vas a poder publicar en comunidad cuando se apruebe.'),
('en', 'comunidad', 'artist_pending', 'Your profile is still under review — you''ll be able to post in the community once it''s approved.'),
('pt', 'comunidad', 'artist_pending', 'Seu perfil ainda está em análise — você vai poder publicar na comunidade quando for aprovado.'),

('es', 'artist_menu', 'profile_pending', 'Perfil en revisión'),
('en', 'artist_menu', 'profile_pending', 'Profile under review'),
('pt', 'artist_menu', 'profile_pending', 'Perfil em análise')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
