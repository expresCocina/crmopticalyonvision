-- =====================================================
-- SISTEMA DE GRUPOS DE CLIENTES
-- =====================================================
-- Permite organizar clientes en grupos personalizados
-- para marketing segmentado y mejor organización
-- =====================================================

-- Tabla de grupos de clientes
CREATE TABLE IF NOT EXISTS customer_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#3b82f6', -- Color hex para UI
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de relación muchos-a-muchos entre leads y grupos
CREATE TABLE IF NOT EXISTS lead_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  group_id UUID REFERENCES customer_groups(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID REFERENCES profiles(id),
  UNIQUE(lead_id, group_id) -- Un lead solo puede estar una vez en cada grupo
);

-- Índices para mejorar performance de queries
CREATE INDEX IF NOT EXISTS idx_lead_groups_lead ON lead_groups(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_groups_group ON lead_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_customer_groups_name ON customer_groups(name);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_customer_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customer_groups_updated_at
  BEFORE UPDATE ON customer_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_groups_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE customer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_groups ENABLE ROW LEVEL SECURITY;

-- Políticas para customer_groups
CREATE POLICY "Users can view all groups" 
  ON customer_groups FOR SELECT 
  USING (true);

CREATE POLICY "Users can create groups" 
  ON customer_groups FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update groups" 
  ON customer_groups FOR UPDATE 
  USING (true);

CREATE POLICY "Users can delete groups" 
  ON customer_groups FOR DELETE 
  USING (true);

-- Políticas para lead_groups
CREATE POLICY "Users can view all lead-group relations" 
  ON lead_groups FOR SELECT 
  USING (true);

CREATE POLICY "Users can create lead-group relations" 
  ON lead_groups FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can delete lead-group relations" 
  ON lead_groups FOR DELETE 
  USING (true);

-- =====================================================
-- VISTA PARA CONTAR MIEMBROS POR GRUPO
-- =====================================================

CREATE OR REPLACE VIEW group_member_counts AS
SELECT 
  g.id,
  g.name,
  g.description,
  g.color,
  g.created_at,
  COUNT(lg.lead_id) as member_count
FROM customer_groups g
LEFT JOIN lead_groups lg ON g.id = lg.group_id
GROUP BY g.id, g.name, g.description, g.color, g.created_at;

-- =====================================================
-- FUNCIONES ÚTILES
-- =====================================================

-- Función para obtener todos los grupos de un lead
CREATE OR REPLACE FUNCTION get_lead_groups(lead_uuid UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  color TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    g.name,
    g.description,
    g.color
  FROM customer_groups g
  INNER JOIN lead_groups lg ON g.id = lg.group_id
  WHERE lg.lead_id = lead_uuid;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener todos los leads de un grupo
CREATE OR REPLACE FUNCTION get_group_leads(group_uuid UUID)
RETURNS TABLE (
  id UUID,
  wa_id TEXT,
  full_name TEXT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.wa_id,
    l.full_name,
    l.status::TEXT
  FROM leads l
  INNER JOIN lead_groups lg ON l.id = lg.lead_id
  WHERE lg.group_id = group_uuid;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DATOS DE EJEMPLO (OPCIONAL - COMENTAR SI NO SE DESEA)
-- =====================================================

-- Insertar algunos grupos de ejemplo
-- INSERT INTO customer_groups (name, description, color) VALUES
--   ('Universidad Asturias', 'Clientes de la Universidad Asturias', '#3b82f6'),
--   ('Clientes VIP', 'Clientes de alto valor', '#f59e0b'),
--   ('Campaña Febrero 2026', 'Clientes de campaña de febrero', '#10b981');

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Verificar que las tablas se crearon correctamente
SELECT 'customer_groups' as table_name, COUNT(*) as count FROM customer_groups
UNION ALL
SELECT 'lead_groups' as table_name, COUNT(*) as count FROM lead_groups;
