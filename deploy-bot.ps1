#!/usr/bin/env pwsh
# Script de despliegue rápido para whatsapp-inbound

Write-Host "🚀 Desplegando whatsapp-inbound a Supabase..." -ForegroundColor Cyan

npx supabase functions deploy whatsapp-inbound --no-verify-jwt

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Despliegue exitoso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "El bot ya debería estar funcionando." -ForegroundColor Yellow
    Write-Host "Envía 'Hola' desde WhatsApp para probarlo." -ForegroundColor Yellow
}
else {
    Write-Host "❌ Error en el despliegue" -ForegroundColor Red
    Write-Host "Revisa los logs arriba para más detalles" -ForegroundColor Red
}
