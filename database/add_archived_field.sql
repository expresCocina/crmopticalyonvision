-- Agregar campo 'archived' a la tabla leads para archivar conversaciones
ALTER TABLE leads ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- Crear índice para mejorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_leads_archived ON leads(archived);

-- Comentario para documentar el campo
COMMENT ON COLUMN leads.archived IS 'Indica si la conversación está archivada (oculta por defecto en el Chat Center)';
