-- ============================================
-- CREAR TABLA DE MARKETING CAMPAIGNS
-- ============================================

CREATE TABLE IF NOT EXISTS marketing_campaigns (
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
  current_group_index INTEGER DEFAULT 0, -- Para envíos escalonados
  
  -- Auditoría
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_marketing_status ON marketing_campaigns(is_active);
CREATE INDEX IF NOT EXISTS idx_marketing_created_at ON marketing_campaigns(created_at DESC);

-- RLS
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all marketing" ON marketing_campaigns FOR ALL USING (true) WITH CHECK (true);

-- Permisos
GRANT ALL ON marketing_campaigns TO authenticated;
GRANT ALL ON marketing_campaigns TO service_role;

-- Recargar esquema
NOTIFY pgrst, 'reload';
