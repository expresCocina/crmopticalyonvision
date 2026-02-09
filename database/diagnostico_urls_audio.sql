-- Verificar audios recientes y sus URLs
SELECT 
  id,
  lead_id,
  type,
  media_url,
  direction,
  status,
  created_at,
  -- Verificar si la URL es de Supabase o WhatsApp
  CASE 
    WHEN media_url LIKE '%supabase.co/storage%' THEN 'Supabase Storage'
    WHEN media_url LIKE '%lookaside.fbsbx.com%' THEN 'WhatsApp'
    ELSE 'Otro'
  END as url_source,
  -- Verificar si es signed URL
  CASE 
    WHEN media_url LIKE '%token=%' THEN 'Signed URL'
    ELSE 'Public URL'
  END as url_type
FROM messages 
WHERE type = 'audio'
ORDER BY created_at DESC 
LIMIT 5;
