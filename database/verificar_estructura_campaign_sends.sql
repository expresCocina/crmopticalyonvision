-- Verificar la estructura de la tabla campaign_sends
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'campaign_sends'
ORDER BY ordinal_position;
