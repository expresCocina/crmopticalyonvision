-- Ver el último mensaje de imagen enviado con todos los detalles
SELECT 
  id,
  lead_id,
  type,
  media_url,
  caption,
  content,
  direction,
  status,
  wa_message_id,
  created_at
FROM messages 
WHERE type = 'image' 
  AND direction = 'outbound'
ORDER BY created_at DESC 
LIMIT 1;
