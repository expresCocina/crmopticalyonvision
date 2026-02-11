-- Verificar si el lead tiene tags en la tabla lead_tags
SELECT l.id, l.full_name, l.wa_id, l.tags as tags_en_leads, 
       array_agg(lt.tag) as tags_en_lead_tags
FROM leads l
LEFT JOIN lead_tags lt ON l.id = lt.lead_id
GROUP BY l.id, l.full_name, l.wa_id, l.tags
ORDER BY l.created_at DESC
LIMIT 10;

-- Ver todos los tags asignados
SELECT * FROM lead_tags ORDER BY created_at DESC;
