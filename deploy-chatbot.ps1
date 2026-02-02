# Script de Despliegue del Chatbot - Óptica Lyon Visión
# Ejecutar este script para desplegar todas las actualizaciones del chatbot

Write-Host "🤖 Desplegando Chatbot de WhatsApp - Óptica Lyon Visión" -ForegroundColor Cyan
Write-Host ""

# 1. Aplicar migraciones de base de datos
Write-Host "📊 Paso 1: Aplicando migraciones de base de datos..." -ForegroundColor Yellow
Write-Host "Ejecutando: database/add_bot_control.sql" -ForegroundColor Gray

# Aquí el usuario debe ejecutar la migración en Supabase Dashboard
Write-Host ""
Write-Host "⚠️  ACCIÓN REQUERIDA:" -ForegroundColor Red
Write-Host "1. Ve a tu proyecto en Supabase Dashboard" -ForegroundColor White
Write-Host "2. Navega a SQL Editor" -ForegroundColor White
Write-Host "3. Copia y pega el contenido de: database/add_bot_control.sql" -ForegroundColor White
Write-Host "4. Ejecuta la consulta" -ForegroundColor White
Write-Host ""
Read-Host "Presiona Enter cuando hayas completado la migración de base de datos"

# 2. Aplicar trigger de reactivación del bot
Write-Host ""
Write-Host "📊 Paso 2: Actualizando trigger de reactivación del bot..." -ForegroundColor Yellow
Write-Host "Ejecutando: database/bot_reactivation_trigger.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  ACCIÓN REQUERIDA:" -ForegroundColor Red
Write-Host "1. En Supabase SQL Editor" -ForegroundColor White
Write-Host "2. Copia y pega el contenido de: database/bot_reactivation_trigger.sql" -ForegroundColor White
Write-Host "3. Ejecuta la consulta" -ForegroundColor White
Write-Host ""
Read-Host "Presiona Enter cuando hayas completado el trigger"

# 3. Desplegar funciones Edge
Write-Host ""
Write-Host "🚀 Paso 3: Desplegando Edge Functions..." -ForegroundColor Yellow

Write-Host "Desplegando whatsapp-inbound..." -ForegroundColor Gray
supabase functions deploy whatsapp-inbound

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ whatsapp-inbound desplegado exitosamente" -ForegroundColor Green
}
else {
    Write-Host "❌ Error desplegando whatsapp-inbound" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Desplegando whatsapp-outbound..." -ForegroundColor Gray
supabase functions deploy whatsapp-outbound

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ whatsapp-outbound desplegado exitosamente" -ForegroundColor Green
}
else {
    Write-Host "❌ Error desplegando whatsapp-outbound" -ForegroundColor Red
    exit 1
}

# 4. Verificación
Write-Host ""
Write-Host "✅ DESPLIEGUE COMPLETADO" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Resumen de cambios:" -ForegroundColor Cyan
Write-Host "  ✓ Agregadas columnas bot_active y unread_count a tabla leads" -ForegroundColor White
Write-Host "  ✓ Creada función RPC increment_unread_count" -ForegroundColor White
Write-Host "  ✓ Actualizado trigger de reactivación del bot" -ForegroundColor White
Write-Host "  ✓ Desplegada función whatsapp-inbound con menú numérico completo" -ForegroundColor White
Write-Host "  ✓ Desplegada función whatsapp-outbound con desactivación de bot" -ForegroundColor White
Write-Host ""
Write-Host "🧪 Próximos pasos:" -ForegroundColor Yellow
Write-Host "  1. Prueba el chatbot enviando 'hola' a tu número de WhatsApp" -ForegroundColor White
Write-Host "  2. Navega por las opciones 1-6 del menú" -ForegroundColor White
Write-Host "  3. Verifica que los tags se asignen correctamente en el CRM" -ForegroundColor White
Write-Host "  4. Prueba la transferencia a asesor (opción 6)" -ForegroundColor White
Write-Host ""
