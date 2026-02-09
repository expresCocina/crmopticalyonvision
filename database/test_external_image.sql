-- Test: Enviar imagen usando URL externa para verificar que WhatsApp funciona
-- Ejecuta este query para actualizar manualmente un mensaje y reenviarlo

-- Primero, obtén el lead_id de tu conversación de prueba
SELECT id, full_name, wa_id FROM leads WHERE wa_id = '573136537231';

-- Luego, puedes probar enviando una imagen de prueba usando la API directamente
-- O modificar temporalmente el código para usar una URL de prueba como:
-- https://picsum.photos/200/300
