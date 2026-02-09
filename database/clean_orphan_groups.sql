-- =====================================================
-- FIX: Limpiar asignaciones fantasmas de grupos eliminados
-- =====================================================

-- 1. Eliminar asignaciones de grupos que ya no existen en customer_groups
DELETE FROM lead_groups
WHERE group_id NOT IN (SELECT id FROM customer_groups);

-- 2. (Opcional) Si se quiere reiniciar TODO para probar desde cero:
-- Descomentar las siguientes líneas si el usuario quiere borrar TODOS los grupos actuales y empezar limpio
-- DELETE FROM lead_groups;
-- DELETE FROM customer_groups;

-- 3. Verificar estado actual
SELECT COUNT(*) as total_asignaciones FROM lead_groups;
SELECT * FROM customer_groups;
