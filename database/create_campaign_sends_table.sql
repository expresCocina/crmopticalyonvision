-- Crear tabla campaign_sends para rastrear el envío de mensajes de campaña
CREATE TABLE IF NOT EXISTS campaign_sends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_campaign_sends_campaign_id ON campaign_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_lead_id ON campaign_sends(lead_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_message_id ON campaign_sends(message_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_status ON campaign_sends(status);

-- Habilitar RLS (Row Level Security)
ALTER TABLE campaign_sends ENABLE ROW LEVEL SECURITY;

-- Crear política para permitir todas las operaciones (ajustar según necesidades de seguridad)
CREATE POLICY "Enable all operations for authenticated users" ON campaign_sends
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Verificar que la tabla se creó correctamente
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'campaign_sends'
ORDER BY ordinal_position;
