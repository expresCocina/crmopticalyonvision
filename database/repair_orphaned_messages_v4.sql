-- REPARACIÓN DE LEADS HUÉRFANOS (V4)
-- Corregido para usar nombre de columna 'fuente' en vez de 'source'

INSERT INTO public.leads (id, status, fuente, nombre)
SELECT DISTINCT m.lead_id, 
    'nuevo',              -- Valor para 'status' (sí existe)
    'whatsapp',           -- Valor para 'fuente' (¡ESTA era la clave!)
    'Cliente Recuperado'  -- Valor para 'nombre'
FROM public.messages m
LEFT JOIN public.leads l ON m.lead_id = l.id
WHERE l.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Verificación final
SELECT count(*) as "Mensajes Rotos Restantes"
FROM public.messages m
LEFT JOIN public.leads l ON m.lead_id = l.id
WHERE l.id IS NULL;
