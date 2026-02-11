-- Verificar todas las plantillas registradas en el CRM
SELECT 
    id,
    name,
    whatsapp_name,
    whatsapp_language,
    content,
    is_official,
    created_at
FROM message_templates
ORDER BY created_at DESC;

-- Verificar si existe la plantilla específica
SELECT *
FROM message_templates
WHERE whatsapp_name LIKE '%promociones%' OR whatsapp_name LIKE '%asturias%';
