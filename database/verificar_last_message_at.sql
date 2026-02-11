-- Verificar si existe la columna last_message_at en la tabla leads
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'leads' 
  AND column_name = 'last_message_at';

-- Si no existe, agregar la columna
-- ALTER TABLE leads ADD COLUMN last_message_at TIMESTAMPTZ;

-- Actualizar last_message_at con la fecha del último mensaje de cada lead
-- UPDATE leads l
-- SET last_message_at = (
--     SELECT MAX(created_at)
--     FROM messages m
--     WHERE m.lead_id = l.id
-- );

-- Verificar los datos
SELECT id, full_name, wa_id, last_message_at, unread_count
FROM leads
ORDER BY last_message_at DESC NULLS LAST
LIMIT 10;
