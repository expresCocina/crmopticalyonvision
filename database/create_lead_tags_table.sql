-- Crear tabla para tags de leads
CREATE TABLE IF NOT EXISTS lead_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    tag VARCHAR(50) NOT NULL,
    color VARCHAR(20) DEFAULT 'blue',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(lead_id, tag)
);

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_lead_tags_lead_id ON lead_tags(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tags_tag ON lead_tags(tag);

-- Habilitar RLS
ALTER TABLE lead_tags ENABLE ROW LEVEL SECURITY;

-- Política para SELECT (todos los usuarios autenticados pueden ver tags)
CREATE POLICY "Allow authenticated users to select lead_tags" 
ON lead_tags
FOR SELECT
TO authenticated
USING (true);

-- Política para INSERT (usuarios autenticados pueden crear tags)
CREATE POLICY "Allow authenticated users to insert lead_tags" 
ON lead_tags
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política para DELETE (usuarios autenticados pueden eliminar tags)
CREATE POLICY "Allow authenticated users to delete lead_tags" 
ON lead_tags
FOR DELETE
TO authenticated
USING (true);

-- Política para UPDATE (usuarios autenticados pueden actualizar tags)
CREATE POLICY "Allow authenticated users to update lead_tags" 
ON lead_tags
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
