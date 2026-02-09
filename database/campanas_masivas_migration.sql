-- =====================================================
-- MIGRACIÓN: Sistema de Campañas Masivas por Grupos
-- =====================================================
-- Fecha: 2026-02-09
-- Descripción: Agrega funcionalidad para campañas con imágenes,
--              programación por grupos y auto-asignación de clientes

-- 1. AGREGAR CAMPOS A MARKETING_CAMPAIGNS
-- =====================================================

-- Agregar soporte para imágenes en campañas
ALTER TABLE marketing_campaigns 
ADD COLUMN IF NOT EXISTS media_url TEXT;

-- Agregar intervalo de días entre envíos a grupos
ALTER TABLE marketing_campaigns 
ADD COLUMN IF NOT EXISTS send_interval_days INTEGER DEFAULT 3;

-- Agregar índice del grupo actual en proceso
ALTER TABLE marketing_campaigns 
ADD COLUMN IF NOT EXISTS current_group_index INTEGER DEFAULT 0;

-- Agregar array de IDs de grupos objetivo
ALTER TABLE marketing_campaigns 
ADD COLUMN IF NOT EXISTS target_groups UUID[];

-- Agregar fecha del último envío
ALTER TABLE marketing_campaigns 
ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ;

-- Agregar tipo de campaña (text, image, image_text)
ALTER TABLE marketing_campaigns 
ADD COLUMN IF NOT EXISTS campaign_type TEXT DEFAULT 'text';

COMMENT ON COLUMN marketing_campaigns.media_url IS 'URL de la imagen para campañas con imagen';
COMMENT ON COLUMN marketing_campaigns.send_interval_days IS 'Días entre envíos a cada grupo (default: 3)';
COMMENT ON COLUMN marketing_campaigns.current_group_index IS 'Índice del grupo actual en proceso de envío';
COMMENT ON COLUMN marketing_campaigns.target_groups IS 'Array de UUIDs de grupos objetivo';
COMMENT ON COLUMN marketing_campaigns.last_sent_at IS 'Fecha del último envío realizado';
COMMENT ON COLUMN marketing_campaigns.campaign_type IS 'Tipo: text, image, image_text';

-- 2. FUNCIÓN: AUTO-ASIGNAR CLIENTES A GRUPOS
-- =====================================================

CREATE OR REPLACE FUNCTION auto_assign_customer_groups(
    batch_size INTEGER DEFAULT 50,
    group_prefix TEXT DEFAULT 'Grupo'
)
RETURNS TABLE (
    group_id UUID,
    group_name TEXT,
    customer_count BIGINT
) AS $$
DECLARE
    total_customers INTEGER;
    num_groups INTEGER;
    current_batch INTEGER := 0;
    new_group_id UUID;
    new_group_name TEXT;
BEGIN
    -- Contar total de clientes (leads)
    SELECT COUNT(*) INTO total_customers FROM leads;
    
    -- Calcular número de grupos necesarios
    num_groups := CEIL(total_customers::NUMERIC / batch_size);
    
    -- Crear grupos y asignar clientes
    FOR i IN 1..num_groups LOOP
        -- Crear nombre del grupo
        new_group_name := group_prefix || ' ' || i;
        
        -- Verificar si el grupo ya existe
        SELECT id INTO new_group_id 
        FROM customer_groups 
        WHERE name = new_group_name;
        
        -- Si no existe, crear el grupo
        IF new_group_id IS NULL THEN
            INSERT INTO customer_groups (name, description, created_at)
            VALUES (
                new_group_name,
                'Auto-generado: ' || batch_size || ' clientes por grupo',
                NOW()
            )
            RETURNING id INTO new_group_id;
        END IF;
        
        -- Asignar clientes al grupo (los siguientes batch_size clientes sin grupo)
        WITH customers_to_assign AS (
            SELECT l.id
            FROM leads l
            LEFT JOIN lead_groups lg ON l.id = lg.lead_id
            WHERE lg.lead_id IS NULL  -- Solo clientes sin grupo
            ORDER BY l.created_at
            LIMIT batch_size
        )
        INSERT INTO lead_groups (lead_id, group_id)
        SELECT id, new_group_id
        FROM customers_to_assign
        ON CONFLICT (lead_id, group_id) DO NOTHING;
        
        -- Retornar información del grupo creado
        RETURN QUERY
        SELECT 
            new_group_id,
            new_group_name,
            COUNT(*)::BIGINT
        FROM lead_groups
        WHERE group_id = new_group_id;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_assign_customer_groups IS 
'Auto-asigna clientes a grupos de tamaño especificado. 
Parámetros:
- batch_size: Número de clientes por grupo (default: 50)
- group_prefix: Prefijo para nombres de grupos (default: "Grupo")
Retorna: Lista de grupos creados con su ID, nombre y cantidad de clientes';

-- 3. FUNCIÓN: OBTENER SIGUIENTE GRUPO PARA CAMPAÑA
-- =====================================================

CREATE OR REPLACE FUNCTION get_next_campaign_group(campaign_id_param UUID)
RETURNS UUID AS $$
DECLARE
    next_group_id UUID;
    current_index INTEGER;
    target_groups_array UUID[];
BEGIN
    -- Obtener índice actual y array de grupos
    SELECT current_group_index, target_groups
    INTO current_index, target_groups_array
    FROM marketing_campaigns
    WHERE id = campaign_id_param;
    
    -- Verificar si hay grupos objetivo
    IF target_groups_array IS NULL OR array_length(target_groups_array, 1) IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Verificar si ya se enviaron a todos los grupos
    IF current_index >= array_length(target_groups_array, 1) THEN
        RETURN NULL;
    END IF;
    
    -- Obtener el siguiente grupo (índice + 1 porque arrays en PostgreSQL empiezan en 1)
    next_group_id := target_groups_array[current_index + 1];
    
    RETURN next_group_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_next_campaign_group IS 
'Obtiene el ID del siguiente grupo a enviar en una campaña.
Retorna NULL si no hay más grupos o si ya se completó la campaña.';

-- 4. FUNCIÓN: MARCAR GRUPO COMO ENVIADO
-- =====================================================

CREATE OR REPLACE FUNCTION mark_campaign_group_sent(campaign_id_param UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE marketing_campaigns
    SET 
        current_group_index = current_group_index + 1,
        last_sent_at = NOW()
    WHERE id = campaign_id_param;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_campaign_group_sent IS 
'Incrementa el índice del grupo actual y actualiza la fecha del último envío.';

-- 5. VISTA: RESUMEN DE CAMPAÑAS ACTIVAS
-- =====================================================

CREATE OR REPLACE VIEW campaign_progress AS
SELECT 
    mc.id,
    mc.name,
    mc.campaign_type,
    mc.current_group_index,
    COALESCE(array_length(mc.target_groups, 1), 0) as total_groups,
    mc.sent_count,
    mc.last_sent_at,
    mc.send_interval_days,
    -- Calcular próxima fecha de envío
    CASE 
        WHEN mc.last_sent_at IS NULL THEN NOW()
        ELSE mc.last_sent_at + (mc.send_interval_days || ' days')::INTERVAL
    END as next_send_date,
    -- Calcular progreso
    CASE 
        WHEN array_length(mc.target_groups, 1) IS NULL OR array_length(mc.target_groups, 1) = 0 THEN 0
        ELSE ROUND((mc.current_group_index::NUMERIC / array_length(mc.target_groups, 1)) * 100, 2)
    END as progress_percentage,
    -- Estado
    CASE 
        WHEN mc.current_group_index >= COALESCE(array_length(mc.target_groups, 1), 0) THEN 'completed'
        WHEN mc.is_active = false THEN 'paused'
        ELSE 'active'
    END as status
FROM marketing_campaigns mc
WHERE mc.is_active = true OR mc.current_group_index > 0;

COMMENT ON VIEW campaign_progress IS 
'Vista con información de progreso de campañas activas y completadas.';

-- 6. ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_campaigns_active 
ON marketing_campaigns(is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_campaigns_next_send 
ON marketing_campaigns(last_sent_at, send_interval_days) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_lead_groups_group_id 
ON lead_groups(group_id);

-- 7. POLÍTICAS RLS (si no existen)
-- =====================================================

-- Permitir a usuarios autenticados ver campañas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'marketing_campaigns' 
        AND policyname = 'Users can view campaigns'
    ) THEN
        CREATE POLICY "Users can view campaigns"
        ON marketing_campaigns FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END $$;

-- Permitir a usuarios autenticados crear campañas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'marketing_campaigns' 
        AND policyname = 'Users can create campaigns'
    ) THEN
        CREATE POLICY "Users can create campaigns"
        ON marketing_campaigns FOR INSERT
        TO authenticated
        WITH CHECK (true);
    END IF;
END $$;

-- Permitir a usuarios autenticados actualizar campañas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'marketing_campaigns' 
        AND policyname = 'Users can update campaigns'
    ) THEN
        CREATE POLICY "Users can update campaigns"
        ON marketing_campaigns FOR UPDATE
        TO authenticated
        USING (true);
    END IF;
END $$;

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================

-- Verificación
SELECT 'Migración completada exitosamente' as status;

-- Mostrar resumen de cambios
SELECT 
    'marketing_campaigns' as tabla,
    COUNT(*) FILTER (WHERE column_name IN ('media_url', 'send_interval_days', 'current_group_index', 'target_groups', 'last_sent_at', 'campaign_type')) as nuevas_columnas
FROM information_schema.columns
WHERE table_name = 'marketing_campaigns';
