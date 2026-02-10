-- Listar todas las tablas para encontrar la correcta
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Intentar adivinar nombres comunes y ver su estructura si existen
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name LIKE '%templat%' 
   OR table_name LIKE '%plantilla%';
