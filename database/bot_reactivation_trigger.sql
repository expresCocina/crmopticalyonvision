-- ==============================================================================
-- BOT AUTO-REACTIVATION TRIGGER - DISABLED
-- ==============================================================================
-- NOTA: Este trigger ha sido deshabilitado porque causaba que el bot se 
-- desactivara cuando el bot mismo respondía (todos los mensajes outbound).
-- 
-- La desactivación del bot ahora se maneja correctamente en la función
-- whatsapp-outbound, que solo desactiva el bot cuando un AGENTE HUMANO
-- envía un mensaje desde el CRM, no cuando el bot responde automáticamente.
-- ==============================================================================

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_agent_message ON messages;

-- Drop function if exists
DROP FUNCTION IF EXISTS update_last_agent_interaction();

-- La lógica de desactivación del bot está en:
-- supabase/functions/whatsapp-outbound/index.ts
-- Líneas 142-149: Actualiza bot_active = false cuando agente envía mensaje
