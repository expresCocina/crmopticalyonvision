-- ==============================================================================
-- Agregar soporte para mensajes multimedia (imágenes, audio, video)
-- ==============================================================================

-- Agregar columna media_url para almacenar URLs de archivos multimedia
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url TEXT;

-- Agregar columna caption para almacenar el caption de imágenes/videos
ALTER TABLE messages ADD COLUMN IF NOT EXISTS caption TEXT;

-- Verificar
SELECT 'Columnas media_url y caption agregadas correctamente' AS status;
