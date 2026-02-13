-- REPARACIÓN V3: A PRUEBA DE BALAS
-- Este script inserta los leads faltantes usando SOLO las columnas que sabemos que existen seguro (id, status, source)
-- Si faltan columnas obligatorias (NOT NULL) postgres nos dirá cual es, pero 'id' es la clave.

INSERT INTO public.leads (id, status, source)
SELECT DISTINCT m.lead_id, 'nuevo', 'whatsapp'
FROM public.messages m
LEFT JOIN public.leads l ON m.lead_id = l.id
WHERE l.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Resultado final (debe ser 0)
SELECT count(*) as "Mensajes Huérfanos Restantes"
FROM public.messages m
LEFT JOIN public.leads l ON m.lead_id = l.id
WHERE l.id IS NULL;
