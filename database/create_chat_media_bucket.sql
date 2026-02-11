-- Crear bucket para almacenar medios del chat (imágenes, videos, audios)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir insertar archivos (solo autenticados)
CREATE POLICY "Allow authenticated users to upload chat media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-media');

-- Política para permitir leer archivos (público)
CREATE POLICY "Allow public to read chat media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-media');

-- Política para permitir actualizar archivos (solo autenticados)
CREATE POLICY "Allow authenticated users to update chat media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'chat-media');

-- Política para permitir eliminar archivos (solo autenticados)
CREATE POLICY "Allow authenticated users to delete chat media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-media');
