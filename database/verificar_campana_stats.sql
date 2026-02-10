-- Verificar si hay mensajes vinculados a la campaña "nuevo"
SELECT 
    cs.id as campaign_send_id,
    cs.campaign_id,
    cs.status as campaign_status,
    cs.message_id,
    m.content,
    m.status as message_status,
    m.wa_message_id,
    m.created_at
FROM campaign_sends cs
LEFT JOIN messages m ON m.id = cs.message_id
WHERE cs.campaign_id = (
    SELECT id FROM marketing_campaigns WHERE name = 'nuevo' ORDER BY created_at DESC LIMIT 1
)
ORDER BY cs.created_at DESC
LIMIT 10;

-- Ver el ID de la campaña "nuevo"
SELECT id, name, created_at, sent_count 
FROM marketing_campaigns 
WHERE name = 'nuevo' 
ORDER BY created_at DESC 
LIMIT 1;
