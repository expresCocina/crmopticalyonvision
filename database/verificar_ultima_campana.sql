-- Verificar la última campaña "prueba 3 final"
SELECT 
    cs.id as campaign_send_id,
    cs.campaign_id,
    cs.status as campaign_status,
    cs.message_id,
    cs.sent_at,
    m.content,
    m.status as message_status,
    m.wa_message_id,
    m.direction
FROM campaign_sends cs
LEFT JOIN messages m ON m.id = cs.message_id
WHERE cs.campaign_id = (
    SELECT id FROM marketing_campaigns WHERE name LIKE '%prueba%' OR name LIKE '%final%' ORDER BY created_at DESC LIMIT 1
)
ORDER BY cs.sent_at DESC
LIMIT 5;

-- Ver todas las campañas recientes
SELECT id, name, created_at, sent_count 
FROM marketing_campaigns 
ORDER BY created_at DESC 
LIMIT 5;

-- Ver los últimos mensajes enviados
SELECT id, lead_id, content, status, wa_message_id, direction, created_at
FROM messages
WHERE direction = 'outbound'
ORDER BY created_at DESC
LIMIT 10;
