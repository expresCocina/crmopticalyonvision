-- Diagnóstico de Mensajes y Campañas

-- 1. Verificar columnas de la tabla messages
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name IN ('status', 'error_message');

-- 2. Conteo de mensajes por estado en campaign_sends
SELECT status, count(*) 
FROM campaign_sends 
GROUP BY status;

-- 3. Ver los últimos 50 mensajes de campaign_sends para ver qué pasó
SELECT cs.id, cs.status, m.status as message_status, m.error_message
FROM campaign_sends cs
JOIN messages m ON cs.message_id = m.id
ORDER BY cs.created_at DESC
LIMIT 50;
