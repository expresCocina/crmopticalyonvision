-- Ver detalles completos del último audio recibido
SELECT 
  id,
  lead_id,
  type,
  media_url,
  content,
  direction,
  status,
  wa_message_id,
  created_at
FROM messages 
WHERE content LIKE '%Audio%'
  OR type = 'audio'
ORDER BY created_at DESC 
LIMIT 3;
