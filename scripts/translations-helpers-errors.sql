-- Mensajes de error para "Me interesa esta pieza" (antes fallaban en silencio)
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
('es', 'comunidad', 'help_err_session', 'Volvé a iniciar sesión para responder'),
('en', 'comunidad', 'help_err_session', 'Please sign in again to respond'),
('pt', 'comunidad', 'help_err_session', 'Faça login novamente para responder'),

('es', 'comunidad', 'help_err_generic', 'No se pudo registrar, probá de nuevo'),
('en', 'comunidad', 'help_err_generic', 'Could not register, please try again'),
('pt', 'comunidad', 'help_err_generic', 'Não foi possível registrar, tente novamente')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
