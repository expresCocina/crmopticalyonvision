-- ============================================
-- CREAR VISTA group_member_counts
-- ============================================
-- Esta vista es necesaria para el módulo de Clientes
-- Cuenta cuántos miembros tiene cada grupo

CREATE OR REPLACE VIEW public.group_member_counts AS
SELECT 
    cg.id,
    cg.name,
    cg.color,
    cg.description,
    cg.created_at,
    COUNT(lg.lead_id) AS member_count
FROM 
    public.customer_groups cg
LEFT JOIN 
    public.lead_groups lg ON cg.id = lg.group_id
GROUP BY 
    cg.id, cg.name, cg.color, cg.description, cg.created_at;

-- Configurar permisos para la vista
ALTER VIEW public.group_member_counts OWNER TO postgres;
GRANT SELECT ON public.group_member_counts TO authenticated;
GRANT SELECT ON public.group_member_counts TO service_role;

-- Forzar recarga del esquema
NOTIFY pgrst, 'reload';
