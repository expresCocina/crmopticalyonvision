-- Inspección de estructura para soporte de Plantillas WhatsApp
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name IN ('marketing_campaigns', 'templates', 'message_templates')
ORDER BY table_name, ordinal_position;

-- Ver contenido de ejemplo de templates si existe la tabla
SELECT * FROM "templates" LIMIT 5;
-- O message_templates
SELECT * FROM "message_templates" LIMIT 5;
