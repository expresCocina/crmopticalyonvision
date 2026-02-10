-- =====================================================
-- MIGRACIÓN: Soporte para Plantillas Oficiales de WhatsApp
-- =====================================================

-- 1. Agregar columnas a message_templates
-- Para guardar el ID técnico de WhatsApp (ej: 'marketing_template_01')
ALTER TABLE message_templates 
ADD COLUMN IF NOT EXISTS whatsapp_name TEXT;

-- Para guardar el idioma (ej: 'es', 'en')
ALTER TABLE message_templates 
ADD COLUMN IF NOT EXISTS whatsapp_language TEXT DEFAULT 'es';

-- Para diferenciar plantillas oficiales de borradores locales
ALTER TABLE message_templates 
ADD COLUMN IF NOT EXISTS is_official BOOLEAN DEFAULT false;

COMMENT ON COLUMN message_templates.whatsapp_name IS 'Nombre técnico de la plantilla en Meta Business Manager';
COMMENT ON COLUMN message_templates.is_official IS 'Indica si es una plantilla validada por WhatsApp';


-- 2. Agregar columnas a marketing_campaigns
-- Para saber qué plantilla oficial usar al momento del envío
ALTER TABLE marketing_campaigns 
ADD COLUMN IF NOT EXISTS whatsapp_template_name TEXT;

ALTER TABLE marketing_campaigns 
ADD COLUMN IF NOT EXISTS whatsapp_template_lang TEXT;

-- 3. Verificación
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE column_name LIKE 'whatsapp_%' 
AND table_name IN ('message_templates', 'marketing_campaigns');
