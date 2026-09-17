-- Se saca el registro por invitación: ahora el botón "Ingresar" muestra
-- directo la opción de registrarse (queda igual la aprobación manual desde
-- tintatxm para publicar en comunidad)
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
('es', 'ingresar', 'menu_note', 'Armá tu perfil de búsqueda acá'),
('en', 'ingresar', 'menu_note', 'Set up your profile here'),
('pt', 'ingresar', 'menu_note', 'Monte seu perfil aqui'),

('es', 'ingresar', 'register_btn', 'Registro de tatuadores'),
('en', 'ingresar', 'register_btn', 'Tattoo artist registration'),
('pt', 'ingresar', 'register_btn', 'Cadastro de tatuadores')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
