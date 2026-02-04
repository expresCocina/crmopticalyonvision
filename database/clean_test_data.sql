-- ==============================================================================
-- SCRIPT DE LIMPIEZA INMEDIATA (SIN TRANSACCION)
-- ==============================================================================
-- Al ejecutar esto, los datos se borrarán PERMANENTEMENTE de inmediato.
-- ==============================================================================

-- 1. ELIMINAR REGISTROS (Respetando orden correctos)

DELETE FROM campaign_sends;
DELETE FROM automation_logs;
DELETE FROM messages;
DELETE FROM purchases;
DELETE FROM appointments;
DELETE FROM clinical_records;
DELETE FROM marketing_campaigns;
DELETE FROM leads;

-- 2. VERIFICACIÓN FINAL
-- Todo debería dar 0
SELECT 'leads' as tabla, COUNT(*) as registros_restantes FROM leads
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'purchases', COUNT(*) FROM purchases
UNION ALL
SELECT 'appointments', COUNT(*) FROM appointments
UNION ALL
SELECT 'clinical_records', COUNT(*) FROM clinical_records
UNION ALL
SELECT 'campaign_sends', COUNT(*) FROM campaign_sends
UNION ALL
SELECT 'automation_logs', COUNT(*) FROM automation_logs
UNION ALL
SELECT 'marketing_campaigns', COUNT(*) FROM marketing_campaigns;
