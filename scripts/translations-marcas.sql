-- Traducciones ES/EN/PT para el sistema de marcas (registro, sesión, comunidad, suscripción)
-- El español se inserta también para que aparezcan editables en el admin > Idiomas.
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES

-- ==========================================
-- ESPAÑOL (base)
-- ==========================================
('es', 'ingresar',      'solo_marcas',            'Registro de marcas'),
('es', 'ingresar',      'registered_marca_msg',   'Hacé click en el link del mail para completar el perfil de tu marca.'),

('es', 'phrases',       'sponsor_review_short',   'Perfil en revisión'),
('es', 'phrases',       'sponsor_blocked_short',  'Perfil bloqueado — suscripción vencida'),

('es', 'comunidad',     'placeholder_sponsor',    '¿Qué novedad tenés hoy?'),
('es', 'comunidad',     'sponsor_blocked',        'Tu perfil está bloqueado — no podés publicar hasta que se reactive la suscripción.'),
('es', 'comunidad',     'find_us_in',             'Encontranos en'),
('es', 'comunidad',     'view_profile',           'Ver perfil'),

('es', 'sponsor_menu',  'subscription',           'Suscripción'),
('es', 'sponsor_menu',  'subscription_expired',   'Su suscripción venció el'),
('es', 'sponsor_menu',  'subscription_ends',      'Su suscripción se cancelará el'),

('es', 'completar_marca', 'invalid_link',          'Link inválido.'),
('es', 'completar_marca', 'error_password_empty',  'Ingresá tu contraseña'),
('es', 'completar_marca', 'error_create',          'Error al crear la marca'),
('es', 'completar_marca', 'error_wrong_password',  'Contraseña incorrecta'),
('es', 'completar_marca', 'title',                 'Bienvenido a Flashttoo'),
('es', 'completar_marca', 'subtitle',              'Tu cuenta fue creada con éxito. Ingresá con tu contraseña para confirmar el registro de tu marca.'),
('es', 'completar_marca', 'registered_with',       'Cuenta registrada con'),
('es', 'completar_marca', 'password_placeholder',  'Contraseña'),
('es', 'completar_marca', 'btn_loading',           'Confirmando...'),
('es', 'completar_marca', 'btn_confirm',           'Confirmar'),

-- ==========================================
-- INGLÉS
-- ==========================================
('en', 'ingresar',      'solo_marcas',            'Brand registration'),
('en', 'ingresar',      'registered_marca_msg',   'Click the link in the email to complete your brand profile.'),

('en', 'phrases',       'sponsor_review_short',   'Profile under review'),
('en', 'phrases',       'sponsor_blocked_short',  'Profile blocked — subscription expired'),

('en', 'comunidad',     'placeholder_sponsor',    'What''s new today?'),
('en', 'comunidad',     'sponsor_blocked',        'Your profile is blocked — you can''t post until your subscription is reactivated.'),
('en', 'comunidad',     'find_us_in',             'Find us in'),
('en', 'comunidad',     'view_profile',           'View profile'),

('en', 'sponsor_menu',  'subscription',           'Subscription'),
('en', 'sponsor_menu',  'subscription_expired',   'Your subscription expired on'),
('en', 'sponsor_menu',  'subscription_ends',      'Your subscription will end on'),

('en', 'completar_marca', 'invalid_link',          'Invalid link.'),
('en', 'completar_marca', 'error_password_empty',  'Enter your password'),
('en', 'completar_marca', 'error_create',          'Error creating the brand'),
('en', 'completar_marca', 'error_wrong_password',  'Incorrect password'),
('en', 'completar_marca', 'title',                 'Welcome to Flashttoo'),
('en', 'completar_marca', 'subtitle',              'Your account was created successfully. Enter your password to confirm your brand registration.'),
('en', 'completar_marca', 'registered_with',       'Account registered with'),
('en', 'completar_marca', 'password_placeholder',  'Password'),
('en', 'completar_marca', 'btn_loading',           'Confirming...'),
('en', 'completar_marca', 'btn_confirm',           'Confirm'),

-- ==========================================
-- PORTUGUÉS
-- ==========================================
('pt', 'ingresar',      'solo_marcas',            'Cadastro de marcas'),
('pt', 'ingresar',      'registered_marca_msg',   'Clique no link do e-mail para completar o perfil da sua marca.'),

('pt', 'phrases',       'sponsor_review_short',   'Perfil em revisão'),
('pt', 'phrases',       'sponsor_blocked_short',  'Perfil bloqueado — assinatura vencida'),

('pt', 'comunidad',     'placeholder_sponsor',    'Qual a novidade de hoje?'),
('pt', 'comunidad',     'sponsor_blocked',        'Seu perfil está bloqueado — você não pode publicar até que a assinatura seja reativada.'),
('pt', 'comunidad',     'find_us_in',             'Encontre-nos em'),
('pt', 'comunidad',     'view_profile',           'Ver perfil'),

('pt', 'sponsor_menu',  'subscription',           'Assinatura'),
('pt', 'sponsor_menu',  'subscription_expired',   'Sua assinatura venceu em'),
('pt', 'sponsor_menu',  'subscription_ends',      'Sua assinatura será cancelada em'),

('pt', 'completar_marca', 'invalid_link',          'Link inválido.'),
('pt', 'completar_marca', 'error_password_empty',  'Insira sua senha'),
('pt', 'completar_marca', 'error_create',          'Erro ao criar a marca'),
('pt', 'completar_marca', 'error_wrong_password',  'Senha incorreta'),
('pt', 'completar_marca', 'title',                 'Bem-vindo ao Flashttoo'),
('pt', 'completar_marca', 'subtitle',              'Sua conta foi criada com sucesso. Insira sua senha para confirmar o cadastro da sua marca.'),
('pt', 'completar_marca', 'registered_with',       'Conta registrada com'),
('pt', 'completar_marca', 'password_placeholder',  'Senha'),
('pt', 'completar_marca', 'btn_loading',           'Confirmando...'),
('pt', 'completar_marca', 'btn_confirm',           'Confirmar')

ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
