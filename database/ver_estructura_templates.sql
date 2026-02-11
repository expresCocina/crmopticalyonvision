-- Ver la estructura de la tabla message_templates
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'message_templates'
ORDER BY ordinal_position;
