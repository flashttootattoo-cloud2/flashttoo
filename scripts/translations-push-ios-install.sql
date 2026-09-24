-- Instrucción para iPhone sin instalar (reemplaza al toggle de notificaciones hasta que instalen)
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
('es', 'inicio', 'push_ios_install_steps', 'Para recibir notificaciones en iPhone, primero instalá la app: tocá Compartir ⬆️ y elegí "Agregar a inicio". Después abrila desde tu pantalla de inicio y activalas acá.'),
('en', 'inicio', 'push_ios_install_steps', 'To get notifications on iPhone, install the app first: tap Share ⬆️ and choose "Add to Home Screen". Then open it from your home screen and turn them on here.'),
('pt', 'inicio', 'push_ios_install_steps', 'Para receber notificações no iPhone, primeiro instale o app: toque em Compartilhar ⬆️ e escolha "Adicionar à Tela de Início". Depois abra pela tela inicial e ative aqui.')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
