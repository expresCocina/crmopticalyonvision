-- Verificar si se crearon registros en campaign_sends para la campaña "ya"
SELECT 
    cs.id as campaign_send_id,
    cs.campaign_id,
    cs.status as campaign_status,
    cs.message_id,
    cs.sent_at,
    m.content,
    m.status as message_status,
    m.wa_message_id
FROM campaign_sends cs
LEFT JOIN messages m ON m.id = cs.message_id
WHERE cs.campaign_id = (
    SELECT id FROM marketing_campaigns WHERE name = 'ya' ORDER BY created_at DESC LIMIT 1
)
ORDER BY cs.sent_at DESC
LIMIT 20;

-- Ver cuántos registros hay en total
SELECT COUNT(*) as total_records FROM campaign_sends;

-- Ver la campaña "ya"
SELECT id, name, created_at, sent_count 
FROM marketing_campaigns 
WHERE name = 'ya' 
ORDER BY created_at DESC 
LIMIT 1;
