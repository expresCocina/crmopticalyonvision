-- Script de diagnóstico para envío de imágenes
-- Ejecutar en Supabase SQL Editor

-- 1. Ver últimos mensajes de tipo imagen
SELECT 
  id,
  lead_id,
  type,
  media_url,
  caption,
  direction,
  status,
  created_at,
  wa_message_id
FROM messages 
WHERE type = 'image' 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Verificar que el bucket chat-media existe y es público
SELECT 
  id,
  name,
  public
FROM storage.buckets 
WHERE name = 'chat-media';

-- 3. Ver archivos subidos recientemente
SELECT 
  name,
  bucket_id,
  created_at,
  metadata
FROM storage.objects 
WHERE bucket_id = 'chat-media'
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Verificar políticas del bucket
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';
