-- Verificar la plantilla "esta si es astu" que está marcada como oficial
SELECT 
    id,
    name,
    whatsapp_name,
    whatsapp_language,
    is_official,
    content,
    created_at
FROM message_templates
WHERE name LIKE '%astu%' OR whatsapp_name LIKE '%astu%'
ORDER BY created_at DESC;
