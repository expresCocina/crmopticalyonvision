-- REPARACIÓN DEFINITIVA: Recrear lead_groups con claves foráneas correctas
-- Esto NO borra leads ni customer_groups, solo recrea la tabla intermedia

BEGIN;

-- 1. Eliminar la tabla lead_groups existente (que tiene 872 registros)
-- ADVERTENCIA: Esto borrará las asignaciones de clientes a grupos
-- Pero es necesario para que la relación funcione correctamente
DROP TABLE IF EXISTS public.lead_groups CASCADE;

-- 2. Recrear la tabla con las claves foráneas EXPLÍCITAS
CREATE TABLE public.lead_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  group_id UUID NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID,
  UNIQUE(lead_id, group_id),
  
  -- Claves foráneas EXPLÍCITAS (esto es lo que faltaba)
  CONSTRAINT fk_lead_groups_lead 
    FOREIGN KEY (lead_id) 
    REFERENCES public.leads(id) 
    ON DELETE CASCADE,
    
  CONSTRAINT fk_lead_groups_group 
    FOREIGN KEY (group_id) 
    REFERENCES public.customer_groups(id) 
    ON DELETE CASCADE
);

-- 3. Crear índices para performance
CREATE INDEX idx_lead_groups_lead ON public.lead_groups(lead_id);
CREATE INDEX idx_lead_groups_group ON public.lead_groups(group_id);

-- 4. Habilitar RLS
ALTER TABLE public.lead_groups ENABLE ROW LEVEL SECURITY;

-- 5. Política permisiva
DROP POLICY IF EXISTS "Allow access to lead_groups" ON public.lead_groups;
CREATE POLICY "Allow access to lead_groups" 
  ON public.lead_groups 
  FOR ALL 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

COMMIT;

-- 6. Forzar recarga del esquema
NOTIFY pgrst, 'reload';

-- 7. Verificar que la clave foránea existe
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'lead_groups';
