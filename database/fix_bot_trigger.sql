-- ==============================================================================
-- FIX: Eliminar trigger que desactiva bot incorrectamente
-- ==============================================================================
-- PROBLEMA: El trigger on_agent_message estaba desactivando el bot en TODOS
-- los mensajes outbound, incluyendo cuando el bot mismo respondía.
--
-- SOLUCIÓN: Eliminar el trigger. La desactivación del bot ahora se maneja
-- correctamente en whatsapp-outbound, que solo desactiva cuando un agente
-- humano envía mensaje desde el CRM.
-- ==============================================================================

-- Eliminar trigger
DROP TRIGGER IF EXISTS on_agent_message ON messages;

-- Eliminar función
DROP FUNCTION IF EXISTS update_last_agent_interaction();

-- Verificar que se eliminaron correctamente
SELECT 'Trigger y función eliminados correctamente' AS status;
