# Script para desplegar el bot de calificación WhatsApp
Write-Host "🚀 Desplegando bot de calificación..."
Write-Host ""

cmd /c "npx supabase functions deploy whatsapp-inbound --project-ref kdzxoyuininlddighfhov --no-verify-jwt"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Bot desplegado exitosamente" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔗 URL de la función:" -ForegroundColor Cyan
    Write-Host "https://kdzxoyuininlddighfhov.supabase.co/functions/v1/whatsapp-inbound"
    Write-Host ""
    Write-Host "📊 Próximo paso: Ejecutar el script SQL en Supabase" -ForegroundColor Yellow
}
else {
    Write-Host ""
    Write-Host "❌ Error en el despliegue" -ForegroundColor Red
    Write-Host "Revisa el mensaje de error arriba" -ForegroundColor Yellow
    exit 1
}
