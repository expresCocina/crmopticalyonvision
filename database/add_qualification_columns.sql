-- ============================================
-- AGREGAR COLUMNAS PARA SISTEMA DE CALIFICACIÓN DE LEADS
-- ============================================

BEGIN;

-- 1. Agregar columna para datos de calificación (JSONB)
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS qualification_data JSONB DEFAULT '{}'::jsonb;

-- 2. Agregar columna para puntaje de calificación
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS qualification_score INTEGER DEFAULT 0;

-- 3. Agregar columna para contador de reintentos
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- 4. Crear índice para búsquedas por score
CREATE INDEX IF NOT EXISTS idx_leads_qualification_score ON leads(qualification_score DESC);

-- 5. Crear índice GIN para búsquedas en qualification_data
CREATE INDEX IF NOT EXISTS idx_leads_qualification_data ON leads USING GIN(qualification_data);

-- 6. Comentarios para documentación
COMMENT ON COLUMN leads.qualification_data IS 'Datos recopilados durante calificación: presupuesto, ciudad, tipo de producto, etc.';
COMMENT ON COLUMN leads.qualification_score IS 'Puntuación de calificación (0-100): más alto = mejor lead';
COMMENT ON COLUMN leads.retry_count IS 'Contador de reintentos cuando el usuario no responde con opciones válidas';

COMMIT;

-- Recargar caché de esquema
NOTIFY pgrst, 'reload';
