-- Ver todas las plantillas actuales
SELECT id, name, category, whatsapp_name, is_official, created_at
FROM message_templates
ORDER BY created_at DESC;

-- OPCIÓN 1: Eliminar TODAS las plantillas (cuidado!)
-- DELETE FROM message_templates;

-- OPCIÓN 2: Eliminar plantillas específicas por nombre
-- Descomenta las que quieras eliminar:

-- DELETE FROM message_templates WHERE name = 'Bienvenida';
-- DELETE FROM message_templates WHERE name = 'PROBANDO';
-- DELETE FROM message_templates WHERE name = 'prueba1';
-- DELETE FROM message_templates WHERE name = 'promociones asturias febrero';
-- DELETE FROM message_templates WHERE name = 'febrero astu';
-- DELETE FROM message_templates WHERE name = 'FEBRERO PROMOCIONES ASTURIAS';
-- DELETE FROM message_templates WHERE name = 'Promoción Lentes';
-- DELETE FROM message_templates WHERE name = 'Promoción Mensual';
-- DELETE FROM message_templates WHERE name = 'Recordatorio Cita';
-- DELETE FROM message_templates WHERE name = 'Saludo Inicial';
-- DELETE FROM message_templates WHERE name = 'Seguimiento 24h';
-- DELETE FROM message_templates WHERE name = 'Seguimiento Post-Venta';

-- OPCIÓN 3: Eliminar todas EXCEPTO las oficiales de WhatsApp
-- DELETE FROM message_templates WHERE is_official = false OR is_official IS NULL;

-- OPCIÓN 4: Mantener solo las plantillas oficiales aprobadas
-- DELETE FROM message_templates WHERE is_official != true;

-- Verificar plantillas restantes
SELECT id, name, category, whatsapp_name, is_official
FROM message_templates
ORDER BY name;
