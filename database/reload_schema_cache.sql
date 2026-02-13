-- FORZAR RECARGA DE CACHÉ DE ESQUEMA (Supabase/PostgREST)
-- Esto es necesario cuando creas tablas nuevas y la API no las ve inmediatamente.

NOTIFY pgrst, 'reload';

-- Verificación: Listar tablas y claves foráneas para confirmar que existen
SELECT
    tc.table_schema, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'lead_groups';
