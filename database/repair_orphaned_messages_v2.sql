-- REPARACIÓN DE INTEGRIDAD REFERENCIAL (V2 - Nombres Correctos)
-- Soluciona error: insert or update on table "messages" violates foreign key constraint

BEGIN;

-- 1. Identificar mensajes huérfanos
CREATE TEMP TABLE orphaned_messages AS
SELECT DISTINCT m.lead_id
FROM public.messages m
LEFT JOIN public.leads l ON m.lead_id = l.id
WHERE l.id IS NULL;

-- 2. Insertar leads "Placeholder" usando nombres de columna CORRECTOS
INSERT INTO public.leads (id, telefono, nombre, status, fuente)
SELECT 
    lead_id, 
    'unknown_' || substr(lead_id::text, 1, 8), -- Telefono temporal
    'Cliente Recuperado (Error ID)', -- Nombre
    'nuevo',
    'whatsapp'
FROM orphaned_messages
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- 3. Verificación final (debe dar 0)
SELECT count(*) as "Mensajes Rotos Restantes"
FROM public.messages m
LEFT JOIN public.leads l ON m.lead_id = l.id
WHERE l.id IS NULL;
