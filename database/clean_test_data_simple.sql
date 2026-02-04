-- ==============================================================================
-- SCRIPT DE LIMPIEZA RÁPIDA - VERSIÓN DIRECTA
-- ==============================================================================
-- Este script elimina todos los datos de prueba de forma directa
-- sin transacciones. Úsalo solo si estás 100% seguro.
-- ==============================================================================

-- ELIMINAR DATOS EN ORDEN (respetando foreign keys)
DELETE FROM campaign_sends;
DELETE FROM automation_logs;
DELETE FROM messages;
DELETE FROM purchases;
DELETE FROM appointments;
DELETE FROM clinical_records;
DELETE FROM marketing_campaigns;
DELETE FROM leads;

-- VERIFICACIÓN
SELECT 
  'LIMPIEZA COMPLETADA' as status,
  (SELECT COUNT(*) FROM leads) as leads,
  (SELECT COUNT(*) FROM messages) as messages,
  (SELECT COUNT(*) FROM purchases) as ventas,
  (SELECT COUNT(*) FROM appointments) as citas,
  (SELECT COUNT(*) FROM clinical_records) as historias_clinicas,
  (SELECT COUNT(*) FROM marketing_campaigns) as campanas;
