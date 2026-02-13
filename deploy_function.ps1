# Script para desplegar la función whatsapp-outbound
# Usa npx para asegurar que se use la versión local de supabase

Write-Host "Iniciando despliegue de whatsapp-outbound..."

# Usar cmd para ejecutar npx y evitar problemas de parsing de argumentos en PowerShell
cmd /c "npx supabase functions deploy whatsapp-outbound --project-ref kdzxoyuininlddighfhov --no-verify-jwt"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Despliegue exitoso"
}
else {
    Write-Host "❌ Error en el despliegue"
    exit 1
}
