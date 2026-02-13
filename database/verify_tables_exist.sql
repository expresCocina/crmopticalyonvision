-- VERIFICACIÓN COMPLETA DE TABLAS Y RELACIONES

-- 1. Verificar que las tablas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('leads', 'customer_groups', 'lead_groups', 'purchases')
ORDER BY table_name;

-- 2. Verificar las claves foráneas de lead_groups
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'lead_groups';

-- 3. Contar registros en cada tabla
SELECT 'leads' as tabla, COUNT(*) as registros FROM leads
UNION ALL
SELECT 'customer_groups', COUNT(*) FROM customer_groups
UNION ALL
SELECT 'lead_groups', COUNT(*) FROM lead_groups
UNION ALL
SELECT 'purchases', COUNT(*) FROM purchases;
