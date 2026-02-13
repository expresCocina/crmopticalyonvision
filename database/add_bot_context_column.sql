-- ============================================
-- AGREGAR COLUMNA FALTANTE: BOT_CONTEXT
-- ============================================

-- La función whatsapp-inbound usa esta columna para guardar el estado del menú
-- Si no existe, el bot no recordará en qué menú está el usuario.

ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS bot_context JSONB DEFAULT '{"menu": "main", "lastMessage": ""}'::jsonb;

-- Asegurar que se pueda consultar por RLS
GRANT ALL ON leads TO service_role;
NOTIFY pgrst, 'reload';
