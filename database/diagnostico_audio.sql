-- Diagnóstico de mensajes de audio

-- 1. Ver últimos audios enviados (outbound)
SELECT 
  id,
  lead_id,
  type,
  media_url,
  direction,
  status,
  wa_message_id,
  created_at
FROM messages 
WHERE type = 'audio' 
  AND direction = 'outbound'
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Ver últimos audios recibidos (inbound)
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
WHERE type = 'audio' 
  AND direction = 'inbound'
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Ver TODOS los mensajes de audio (ambas direcciones)
SELECT 
  id,
  type,
  direction,
  media_url,
  content,
  status,
  created_at
FROM messages 
WHERE type = 'audio'
ORDER BY created_at DESC 
LIMIT 10;
