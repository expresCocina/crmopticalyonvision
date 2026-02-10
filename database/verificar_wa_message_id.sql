-- Ver los últimos 5 mensajes salientes con su wa_message_id
SELECT 
    id,
    LEFT(content, 30) as mensaje,
    status,
    wa_message_id,
    created_at
FROM messages
WHERE direction = 'outbound'
ORDER BY created_at DESC
LIMIT 5;
