-- Link para ir a iniciar sesión cuando el registro detecta cuenta duplicada
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
('es', 'agregar', 'go_login', 'Ir a Flashttoo para iniciar sesión →'),
('en', 'agregar', 'go_login', 'Go to Flashttoo to log in →'),
('pt', 'agregar', 'go_login', 'Ir para o Flashttoo para entrar →')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
