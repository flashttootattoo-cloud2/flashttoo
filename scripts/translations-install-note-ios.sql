-- Instrucción de instalación específica para iOS (no tiene instalación
-- automática, es manual desde Compartir)
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
('es', 'inicio', 'push_install_note_ios', 'En iPhone: tocá el ícono de Compartir (⬆️) y elegí "Agregar a pantalla de inicio".'),
('en', 'inicio', 'push_install_note_ios', 'On iPhone: tap the Share icon (⬆️) and choose "Add to Home Screen".'),
('pt', 'inicio', 'push_install_note_ios', 'No iPhone: toque no ícone Compartilhar (⬆️) e escolha "Adicionar à Tela de Início".')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
