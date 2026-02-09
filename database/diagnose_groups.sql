-- Script de Diagnóstico para Asignación de Grupos

-- 1. Contar total de leads
SELECT COUNT(*) as total_leads FROM leads;

-- 2. Contar leads que YA tienen grupo
SELECT COUNT(DISTINCT lead_id) as leads_with_group FROM lead_groups;

-- 3. Contar leads DISPONIBLES para asignar (sin grupo)
SELECT COUNT(*) as leads_available
FROM leads l
LEFT JOIN lead_groups lg ON l.id = lg.lead_id
WHERE lg.lead_id IS NULL;

-- 4. Simular la selección del primer lote
SELECT l.id, l.full_name, l.created_at
FROM leads l
LEFT JOIN lead_groups lg ON l.id = lg.lead_id
WHERE lg.lead_id IS NULL
ORDER BY l.created_at
LIMIT 10;
