-- =====================================================
-- SCRIPT SEGURO PARA MEJORAS DEL CHAT CENTER
-- Solo crea elementos si NO existen (sin eliminar nada)
-- =====================================================

-- =====================================================
-- PASO 1: Crear tablas (solo si no existen)
-- =====================================================

-- 1. Tabla de plantillas de mensajes
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  category TEXT, -- 'saludo', 'seguimiento', 'promocion', etc.
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Función para actualizar updated_at (solo si no existe)
CREATE OR REPLACE FUNCTION update_message_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger (se recrea si existe)
DROP TRIGGER IF EXISTS message_templates_updated_at ON message_templates;
CREATE TRIGGER message_templates_updated_at
BEFORE UPDATE ON message_templates
FOR EACH ROW
EXECUTE FUNCTION update_message_templates_updated_at();

-- 2. Tabla de log de envíos masivos (control de límites)
CREATE TABLE IF NOT EXISTS bulk_message_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  group_id UUID REFERENCES customer_groups(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  sent_date DATE, -- Se actualiza automáticamente con trigger
  sent_by UUID REFERENCES profiles(id),
  message_content TEXT,
  message_type TEXT DEFAULT 'text'
);

-- Función para actualizar sent_date automáticamente
CREATE OR REPLACE FUNCTION update_bulk_message_log_sent_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.sent_date = NEW.sent_at::DATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar sent_date
DROP TRIGGER IF EXISTS bulk_message_log_set_sent_date ON bulk_message_log;
CREATE TRIGGER bulk_message_log_set_sent_date
BEFORE INSERT OR UPDATE ON bulk_message_log
FOR EACH ROW
EXECUTE FUNCTION update_bulk_message_log_sent_date();

-- Constraint único (solo si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_lead_sent_date'
  ) THEN
    ALTER TABLE bulk_message_log 
    ADD CONSTRAINT unique_lead_sent_date UNIQUE(lead_id, sent_date);
  END IF;
END $$;

-- Índices para performance (solo si no existen)
CREATE INDEX IF NOT EXISTS idx_bulk_log_lead_sent ON bulk_message_log(lead_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_bulk_log_group ON bulk_message_log(group_id);
CREATE INDEX IF NOT EXISTS idx_bulk_log_sent_date ON bulk_message_log(sent_date);

-- 3. Verificar que la tabla messages tenga soporte para multimedia
ALTER TABLE messages ADD COLUMN IF NOT EXISTS caption TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url TEXT;

-- Actualizar columna type si no tiene el default correcto
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'type'
  ) THEN
    ALTER TABLE messages ADD COLUMN type TEXT DEFAULT 'text';
  END IF;
END $$;

-- =====================================================
-- PASO 2: RLS POLICIES (solo si no existen)
-- =====================================================

-- Plantillas de mensajes
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'message_templates' AND policyname = 'Users can view all templates'
  ) THEN
    CREATE POLICY "Users can view all templates" 
    ON message_templates FOR SELECT 
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'message_templates' AND policyname = 'Users can create templates'
  ) THEN
    CREATE POLICY "Users can create templates" 
    ON message_templates FOR INSERT 
    WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'message_templates' AND policyname = 'Users can update templates'
  ) THEN
    CREATE POLICY "Users can update templates" 
    ON message_templates FOR UPDATE 
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'message_templates' AND policyname = 'Users can delete templates'
  ) THEN
    CREATE POLICY "Users can delete templates" 
    ON message_templates FOR DELETE 
    USING (true);
  END IF;
END $$;

-- Log de envíos masivos
ALTER TABLE bulk_message_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bulk_message_log' AND policyname = 'Users can view all logs'
  ) THEN
    CREATE POLICY "Users can view all logs" 
    ON bulk_message_log FOR SELECT 
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bulk_message_log' AND policyname = 'Users can insert logs'
  ) THEN
    CREATE POLICY "Users can insert logs" 
    ON bulk_message_log FOR INSERT 
    WITH CHECK (true);
  END IF;
END $$;

-- =====================================================
-- PASO 3: FUNCIONES AUXILIARES
-- =====================================================

-- Función para obtener leads elegibles para envío masivo
CREATE OR REPLACE FUNCTION get_eligible_leads_for_bulk(
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
-- PASO 4: PLANTILLAS PREDEFINIDAS
-- =====================================================

-- Insertar plantillas solo si no existen
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM message_templates WHERE name = 'Saludo Inicial') THEN
    INSERT INTO message_templates (name, content, category) 
    VALUES ('Saludo Inicial', 'Hola! 👋 Gracias por contactarnos. ¿En qué podemos ayudarte hoy?', 'saludo');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM message_templates WHERE name = 'Seguimiento 24h') THEN
    INSERT INTO message_templates (name, content, category) 
    VALUES ('Seguimiento 24h', 'Hola! Te escribo para dar seguimiento a tu consulta. ¿Tienes alguna duda adicional?', 'seguimiento');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM message_templates WHERE name = 'Recordatorio Cita') THEN
    INSERT INTO message_templates (name, content, category) 
    VALUES ('Recordatorio Cita', 'Te recordamos tu cita para mañana a las {hora}. ¡Te esperamos! 📅', 'recordatorio');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM message_templates WHERE name = 'Promoción Mensual') THEN
    INSERT INTO message_templates (name, content, category) 
    VALUES ('Promoción Mensual', '🎉 Tenemos una promoción especial este mes. ¡Consulta por WhatsApp!', 'promocion');
  END IF;
END $$;

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON TABLE message_templates IS 'Plantillas de mensajes predefinidas para envío rápido';
COMMENT ON TABLE bulk_message_log IS 'Registro de envíos masivos para control de límites de WhatsApp';
COMMENT ON FUNCTION get_eligible_leads_for_bulk IS 'Obtiene leads elegibles para envío masivo (excluye últimos 3 días)';

-- =====================================================
-- FINALIZADO
-- =====================================================
SELECT 'Script ejecutado exitosamente. Tablas y funciones creadas.' as resultado;
