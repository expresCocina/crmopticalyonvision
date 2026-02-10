-- Obtener TODAS las columnas de message_templates
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'message_templates';

-- Ver una muestra de datos para entender estructura (JSON, nombres, etc)
SELECT * FROM "message_templates" LIMIT 3;

-- Verificar si marketing_campaigns tiene alguna referencia a templates
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'marketing_campaigns' 
AND column_name LIKE '%templat%';
