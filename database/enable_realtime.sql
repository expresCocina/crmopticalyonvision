-- ============================================
-- HABILITAR REALTIME EN TABLAS DEL CRM
-- ============================================
-- Este script habilita las suscripciones en tiempo real
-- para que el frontend reciba actualizaciones automáticas

-- Habilitar Realtime en la tabla de mensajes
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Habilitar Realtime en la tabla de leads
ALTER PUBLICATION supabase_realtime ADD TABLE leads;

-- Habilitar Realtime en la tabla de appointments (opcional)
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;

-- Habilitar Realtime en la tabla de purchases (opcional)
ALTER PUBLICATION supabase_realtime ADD TABLE purchases;

-- Verificar que las tablas están en la publicación
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- Forzar recarga del esquema
NOTIFY pgrst, 'reload';
