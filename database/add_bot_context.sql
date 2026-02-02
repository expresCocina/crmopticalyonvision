-- ==============================================================================
-- Agregar columna bot_context para persistir estado del chatbot
-- ==============================================================================

-- Agregar columna para almacenar el contexto del bot (JSON)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS bot_context JSONB DEFAULT '{"menu": "main", "lastMessage": ""}'::jsonb;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_leads_bot_context ON leads USING GIN (bot_context);

-- Verificar
SELECT 'Columna bot_context agregada correctamente' AS status;
