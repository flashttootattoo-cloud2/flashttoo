-- Aviso cuando falla la subida de la foto adjunta al mensaje de comunidad
-- (antes se publicaba igual sin la foto, sin avisar nada)
-- Ejecutar en Supabase SQL Editor

INSERT INTO translations (language_code, section, key, value) VALUES
('es', 'comunidad', 'photo_upload_error', 'No se pudo subir la foto, probá de nuevo'),
('en', 'comunidad', 'photo_upload_error', 'Could not upload the photo, try again'),
('pt', 'comunidad', 'photo_upload_error', 'Não foi possível enviar a foto, tente novamente')
ON CONFLICT (language_code, section, key) DO UPDATE SET value = EXCLUDED.value;
