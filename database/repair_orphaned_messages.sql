-- REPARACIÓN DE INTEGRIDAD REFERENCIAL
-- Este script soluciona el error: insert or update on table "messages" violates foreign key constraint "messages_lead_id_fkey"

BEGIN;

-- 1. Identificar mensajes huérfanos (que tienen un lead_id que no existe en la tabla leads)
CREATE TEMP TABLE orphaned_messages AS
SELECT DISTINCT m.lead_id
FROM public.messages m
LEFT JOIN public.leads l ON m.lead_id = l.id
WHERE l.id IS NULL;

-- 2. Insertar leads "Placeholder" para esos mensajes huérfanos
-- Se usa el mismo ID para mantener la relación.
INSERT INTO public.leads (id, wa_id, full_name, status, source)
SELECT 
    lead_id, 
    'unknown_' || substr(lead_id::text, 1, 8), -- WA_ID temporal
    'Cliente Recuperado (Error ID)', -- Nombre para identificarlo
    'nuevo',
    'whatsapp'
FROM orphaned_messages
ON CONFLICT (id) DO NOTHING;

-- 3. Reportar cuantos se arreglaron
DO $$
DECLARE
    fixed_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO fixed_count FROM orphaned_messages;
    RAISE NOTICE 'Se han recuperado % leads faltantes para mantener la integridad de los mensajes.', fixed_count;
END $$;

COMMIT;

-- 4. Verificar integridad final
SELECT count(*) as "Mensajes Huerfanos Restantes"
FROM public.messages m
LEFT JOIN public.leads l ON m.lead_id = l.id
WHERE l.id IS NULL;
