-- =====================================================
-- FIX DEFINITIVO: Eliminar ambigüedad renombrando parámetro de salida
-- =====================================================

-- Eliminar función anterior por si acaso
DROP FUNCTION IF EXISTS auto_assign_customer_groups(INTEGER, TEXT);

CREATE OR REPLACE FUNCTION auto_assign_customer_groups(
    batch_size INTEGER DEFAULT 50,
    group_prefix TEXT DEFAULT 'Grupo'
)
RETURNS TABLE (
    assigned_group_id UUID, -- RENOMBRADO para evitar conflicto con columna 'group_id'
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
            new_group_id, -- Valor de variable local
            new_group_name,
            COUNT(*)::BIGINT
        FROM lead_groups lg
        WHERE lg.group_id = new_group_id; -- Columna de tabla = Variable local
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;
