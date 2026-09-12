-- Traducciones ES/EN/PT para el sistema de invitaciones de tatuadores
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES

-- ==========================================
-- ESPAÑOL (base)
-- ==========================================
('es', 'ingresar',     'invite_only_note', 'El registro es solo por invitación de otro tatuador o de Flashttoo.'),
('es', 'artist_menu',  'gift_invite',      'Regalar pase a Flashttoo'),
('es', 'artista',      'invited_by',       'Invitado por'),

('es', 'invites', 'title',          'Regalar pase a Flashttoo'),
('es', 'invites', 'loading',        'Cargando...'),
('es', 'invites', 'description',    'El registro en Flashttoo es solo por invitación. Generá un link y mandaselo a otro tatuador para que pueda crear su perfil.'),
('es', 'invites', 'available',      'pases disponibles'),
('es', 'invites', 'monthly_note',   '+1 este mes'),
('es', 'invites', 'generating',     'Generando...'),
('es', 'invites', 'generate_btn',   'Generar y copiar link'),
('es', 'invites', 'your_invites',   'Tus invitados'),
('es', 'invites', 'no_invites',     'Todavía no generaste ninguna invitación.'),
('es', 'invites', 'someone',        'Alguien ya se registró'),
('es', 'invites', 'pending',        'Todavía no lo usó nadie'),
('es', 'invites', 'copy_link',      'Copiar link'),
('es', 'invites', 'copied',         '¡Copiado!'),
('es', 'invites', 'disabled_note',  'Tenés las invitaciones desactivadas por el equipo de Flashttoo.'),

-- ==========================================
-- INGLÉS
-- ==========================================
('en', 'ingresar',     'invite_only_note', 'Registration is by invitation only, from another tattoo artist or from Flashttoo.'),
('en', 'artist_menu',  'gift_invite',      'Gift a Flashttoo pass'),
('en', 'artista',      'invited_by',       'Invited by'),

('en', 'invites', 'title',          'Gift a Flashttoo pass'),
('en', 'invites', 'loading',        'Loading...'),
('en', 'invites', 'description',    'Registration on Flashttoo is invitation-only. Generate a link and send it to another artist so they can create their profile.'),
('en', 'invites', 'available',      'passes available'),
('en', 'invites', 'monthly_note',   '+1 this month'),
('en', 'invites', 'generating',     'Generating...'),
('en', 'invites', 'generate_btn',   'Generate and copy link'),
('en', 'invites', 'your_invites',   'Your invitees'),
('en', 'invites', 'no_invites',     'You haven''t generated any invitations yet.'),
('en', 'invites', 'someone',        'Someone already registered'),
('en', 'invites', 'pending',        'No one has used it yet'),
('en', 'invites', 'copy_link',      'Copy link'),
('en', 'invites', 'copied',         'Copied!'),
('en', 'invites', 'disabled_note',  'Your invitations have been disabled by the Flashttoo team.'),

-- ==========================================
-- PORTUGUÉS
-- ==========================================
('pt', 'ingresar',     'invite_only_note', 'O cadastro é somente por convite de outro tatuador ou da Flashttoo.'),
('pt', 'artist_menu',  'gift_invite',      'Presentear passe da Flashttoo'),
('pt', 'artista',      'invited_by',       'Convidado por'),

('pt', 'invites', 'title',          'Presentear passe da Flashttoo'),
('pt', 'invites', 'loading',        'Carregando...'),
('pt', 'invites', 'description',    'O cadastro na Flashttoo é somente por convite. Gere um link e envie para outro tatuador para que ele possa criar o perfil dele.'),
('pt', 'invites', 'available',      'passes disponíveis'),
('pt', 'invites', 'monthly_note',   '+1 este mês'),
('pt', 'invites', 'generating',     'Gerando...'),
('pt', 'invites', 'generate_btn',   'Gerar e copiar link'),
('pt', 'invites', 'your_invites',   'Seus convidados'),
('pt', 'invites', 'no_invites',     'Você ainda não gerou nenhum convite.'),
('pt', 'invites', 'someone',        'Alguém já se cadastrou'),
('pt', 'invites', 'pending',        'Ainda ninguém usou'),
('pt', 'invites', 'copy_link',      'Copiar link'),
('pt', 'invites', 'copied',         'Copiado!'),
('pt', 'invites', 'disabled_note',  'Seus convites foram desativados pela equipe da Flashttoo.')

ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
