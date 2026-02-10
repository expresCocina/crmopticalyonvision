-- Verificar los últimos 10 mensajes salientes y sus estados
SELECT 
    id,
    LEFT(content, 50) as mensaje,
    status,
    wa_message_id,
    created_at,
    CASE 
        WHEN status = 'sent' THEN '✓ (solo enviado)'
        WHEN status = 'delivered' THEN '✓✓ (entregado)'
        WHEN status = 'read' THEN '✓✓ azul (leído)'
        ELSE status
    END as estado_visual
FROM messages
WHERE direction = 'outbound'
ORDER BY created_at DESC
LIMIT 10;

-- Verificar si hay ALGÚN mensaje que haya cambiado de estado
SELECT 
    status,
    COUNT(*) as cantidad
FROM messages
WHERE direction = 'outbound'
GROUP BY status
ORDER BY cantidad DESC;
