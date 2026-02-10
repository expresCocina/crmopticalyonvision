-- Agregar columna error_message a la tabla messages
-- Esta columna es necesaria para guardar errores cuando un mensaje falla

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Verificar que la columna se agregó correctamente
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name = 'error_message';
