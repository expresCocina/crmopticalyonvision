-- ============================================
-- FORZAR RECREACIÓN DE TABLA MARKETING (CORRIGE ERROR PGRST204)
-- ============================================

-- 1. Eliminar la tabla si existe (para asegurar que se cree con TODAS las columnas nuevas)
DROP TABLE IF EXISTS marketing_campaigns CASCADE;

-- 2. Crear la tabla con la estructura correcta
CREATE TABLE marketing_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  message_template TEXT NOT NULL,
  target_segment TEXT, -- 'todos', 'frios', 'activos', etc.
  target_status TEXT[], -- Array de estados: ['nuevo', 'interesado']
  target_groups TEXT[], -- Array de IDs de grupos
  
  -- Configuración de envío
  scheduled_at TIMESTAMPTZ,
  send_interval_days INTEGER DEFAULT 0,
  campaign_type TEXT DEFAULT 'text', -- 'text', 'image', 'image_text', 'template'
  
  -- Contenido Multimedia
  media_url TEXT,
  
  -- Integración WhatsApp Templates
  whatsapp_template_name TEXT,
  whatsapp_template_lang TEXT DEFAULT 'es',
  
  -- Estado y Métricas
  is_active BOOLEAN DEFAULT false,
  sent_count INTEGER DEFAULT 0,
  last_sent_at TIMESTAMPTZ,
  current_group_index INTEGER DEFAULT 0,
  
  -- Auditoría
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices
CREATE INDEX idx_marketing_status ON marketing_campaigns(is_active);
CREATE INDEX idx_marketing_created_at ON marketing_campaigns(created_at DESC);

-- 4. Seguridad (RLS)
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all marketing" ON marketing_campaigns FOR ALL USING (true) WITH CHECK (true);

-- 5. Permisos Explícitos
GRANT ALL ON marketing_campaigns TO authenticated;
GRANT ALL ON marketing_campaigns TO service_role;

-- 6. Recargar caché de esquema (CRÍTICO)
NOTIFY pgrst, 'reload';
