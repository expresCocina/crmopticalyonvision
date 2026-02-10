-- ==========================================
-- DIAGNÓSTICO DE CAMPAÑAS Y MENSAJES
-- ==========================================

-- 1. Verificar si existe la columna 'error_message' en la tabla 'messages'
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name = 'error_message';

-- 2. Conteo de estados en campaign_sends (para ver qué pasó con los 49 faltantes)
SELECT 
    status, 
    count(*) as cantidad
FROM campaign_sends 
GROUP BY status;

-- 3. Ver los últimos mensajes creados (para detectar errores)
SELECT 
    m.id, 
    m.created_at, 
    m.status, 
    m.content,
    cs.campaign_id
FROM messages m
LEFT JOIN campaign_sends cs ON m.id = cs.message_id
ORDER BY m.created_at DESC
LIMIT 20;

-- 4. Verificar si hay mensajes en estado 'failed' que no se muestran
SELECT count(*) as failed_messages 
FROM messages 
WHERE status = 'failed';
