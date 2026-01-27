-- ==============================================================================
-- MESSAGE TEMPLATES TABLE
-- Para gestionar plantillas de mensajes de marketing
-- ==============================================================================

-- Tabla de plantillas de mensajes
CREATE TABLE IF NOT EXISTS message_templates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text default 'general', -- 'promocion', 'recordatorio', 'seguimiento', 'general'
  content text not null,
  variables text[], -- Array de variables: ['nombre', 'empresa']
  is_active boolean default true,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_message_templates_category ON message_templates(category);
CREATE INDEX IF NOT EXISTS idx_message_templates_active ON message_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_message_templates_created_by ON message_templates(created_by);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_message_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER message_templates_updated_at
BEFORE UPDATE ON message_templates
FOR EACH ROW
EXECUTE FUNCTION update_message_template_updated_at();

-- RLS Policies
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all templates"
ON message_templates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create templates"
ON message_templates FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own templates"
ON message_templates FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own templates"
ON message_templates FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- Insertar plantillas por defecto
INSERT INTO message_templates (name, category, content, variables, is_active) VALUES
('Bienvenida', 'general', 'Hola {nombre}, bienvenido a Óptica Lyon Visión. ¿En qué podemos ayudarte hoy?', ARRAY['nombre'], true),
('Promoción Lentes', 'promocion', '¡Hola {nombre}! 🎉 Tenemos una promoción especial en lentes. 20% de descuento esta semana. ¿Te interesa?', ARRAY['nombre'], true),
('Recordatorio Cita', 'recordatorio', 'Hola {nombre}, te recordamos tu cita para el examen visual mañana a las {hora}. ¿Confirmas tu asistencia?', ARRAY['nombre', 'hora'], true),
('Seguimiento Post-Venta', 'seguimiento', 'Hola {nombre}, ¿cómo te han funcionado tus nuevos lentes? Queremos asegurarnos de que estés satisfecho.', ARRAY['nombre'], true)
ON CONFLICT DO NOTHING;
