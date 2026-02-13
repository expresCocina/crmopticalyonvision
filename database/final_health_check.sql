-- ============================================
-- VERIFICACIÓN DE SALUD DEL SISTEMA
-- ============================================

-- 1. Contar Leads Totales
SELECT count(*) as total_leads FROM leads;

-- 2. Contar Grupos
SELECT count(*) as total_groups FROM customer_groups;

-- 3. Probar la Vista de Conteos (Crucial para el frontend)
SELECT * FROM group_member_counts LIMIT 5;

-- 4. Verificar configuración de Realtime
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- 5. Verificar si hay leads sin wa_id (Integridad)
SELECT count(*) as invalid_leads FROM leads WHERE wa_id IS NULL;
