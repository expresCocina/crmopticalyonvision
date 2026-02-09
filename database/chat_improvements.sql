-- =====================================================
-- SCRIPT DE LIMPIEZA Y RECREACIÓN
-- TABLAS PARA MEJORAS DEL CHAT CENTER
-- =====================================================

-- PASO 1: Limpiar elementos existentes (si existen)
DROP TRIGGER IF EXISTS message_templates_updated_at ON message_templates;
DROP FUNCTION IF EXISTS update_message_templates_updated_at();
DROP FUNCTION IF EXISTS get_eligible_leads_for_bulk(UUID, INT);
DROP TABLE IF EXISTS bulk_message_log CASCADE;
DROP TABLE IF EXISTS message_templates CASCADE;

-- =====================================================
-- PASO 2: Crear tablas nuevas
-- =====================================================

-- 1. Tabla de plantillas de mensajes
CREATE TABLE message_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  category TEXT, -- 'saludo', 'seguimiento', 'promocion', etc.
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para actualizar updated_at
CREATE FUNCTION update_message_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER message_templates_updated_at
BEFORE UPDATE ON message_templates
FOR EACH ROW
EXECUTE FUNCTION update_message_templates_updated_at();

-- 2. Tabla de log de envíos masivos (control de límites)
CREATE TABLE bulk_message_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  group_id UUID REFERENCES customer_groups(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  sent_by UUID REFERENCES profiles(id),
  message_content TEXT,
  message_type TEXT DEFAULT 'text' -- 'text', 'image', 'audio'
);

-- Índices para performance
CREATE INDEX idx_bulk_log_lead_sent ON bulk_message_log(lead_id, sent_at);
CREATE INDEX idx_bulk_log_group ON bulk_message_log(group_id);
CREATE INDEX idx_bulk_log_sent_date ON bulk_message_log((sent_at::DATE));

-- Índice único para evitar múltiples envíos el mismo día al mismo lead
CREATE UNIQUE INDEX idx_unique_lead_date 
ON bulk_message_log(lead_id, (sent_at::DATE));

-- 3. Verificar que la tabla messages tenga soporte para multimedia
ALTER TABLE messages ADD COLUMN IF NOT EXISTS caption TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text';

-- =====================================================
-- PASO 3: RLS POLICIES
-- =====================================================

-- Plantillas de mensajes
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all templates" ON message_templates;
CREATE POLICY "Users can view all templates" 
ON message_templates FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Users can create templates" ON message_templates;
CREATE POLICY "Users can create templates" 
ON message_templates FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update templates" ON message_templates;
CREATE POLICY "Users can update templates" 
ON message_templates FOR UPDATE 
USING (true);

DROP POLICY IF EXISTS "Users can delete templates" ON message_templates;
CREATE POLICY "Users can delete templates" 
ON message_templates FOR DELETE 
USING (true);

-- Log de envíos masivos
ALTER TABLE bulk_message_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all logs" ON bulk_message_log;
CREATE POLICY "Users can view all logs" 
ON bulk_message_log FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Users can insert logs" ON bulk_message_log;
CREATE POLICY "Users can insert logs" 
ON bulk_message_log FOR INSERT 
WITH CHECK (true);

-- =====================================================
-- PASO 4: FUNCIONES AUXILIARES
-- =====================================================

-- Función para obtener leads elegibles para envío masivo
CREATE FUNCTION get_eligible_leads_for_bulk(
  p_group_id UUID,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  wa_id TEXT,
  full_name TEXT,
  last_sent_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.wa_id,
    l.full_name,
    MAX(bml.sent_at) as last_sent_at
  FROM leads l
  INNER JOIN lead_groups lg ON l.id = lg.lead_id
  LEFT JOIN bulk_message_log bml ON l.id = bml.lead_id
  WHERE lg.group_id = p_group_id
    AND (
      bml.sent_at IS NULL 
      OR bml.sent_at < NOW() - INTERVAL '3 days'
    )
  GROUP BY l.id, l.wa_id, l.full_name
  ORDER BY last_sent_at NULLS FIRST
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PASO 5: PLANTILLAS PREDEFINIDAS
-- =====================================================

INSERT INTO message_templates (name, content, category) VALUES
  ('Saludo Inicial', 'Hola! 👋 Gracias por contactarnos. ¿En qué podemos ayudarte hoy?', 'saludo'),
  ('Seguimiento 24h', 'Hola! Te escribo para dar seguimiento a tu consulta. ¿Tienes alguna duda adicional?', 'seguimiento'),
  ('Recordatorio Cita', 'Te recordamos tu cita para mañana a las {hora}. ¡Te esperamos! 📅', 'recordatorio'),
  ('Promoción Mensual', '🎉 Tenemos una promoción especial este mes. ¡Consulta por WhatsApp!', 'promocion')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON TABLE message_templates IS 'Plantillas de mensajes predefinidas para envío rápido';
COMMENT ON TABLE bulk_message_log IS 'Registro de envíos masivos para control de límites de WhatsApp';
COMMENT ON FUNCTION get_eligible_leads_for_bulk IS 'Obtiene leads elegibles para envío masivo (excluye últimos 3 días)';
