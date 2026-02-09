# Campaign Scheduler

Edge Function que ejecuta campañas programadas automáticamente.

## Funcionalidad

- Se ejecuta diariamente mediante cron job
- Busca campañas activas que necesitan envío
- Verifica si es tiempo de enviar (basado en `send_interval_days`)
- Envía mensajes al siguiente grupo de clientes
- Soporta mensajes de texto e imágenes
- Reemplaza variables como `{nombre}` en los mensajes
- Actualiza el progreso de la campaña automáticamente

## Configuración del Cron Job

Para que esta función se ejecute automáticamente cada día:

1. Ve a Supabase Dashboard → Edge Functions
2. Selecciona `campaign-scheduler`
3. En "Cron Jobs", agrega:
   ```
   0 9 * * *
   ```
   (Esto ejecuta la función todos los días a las 9:00 AM)

## Variables de Entorno Requeridas

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Ejemplo de Uso Manual

```bash
curl -X POST https://[tu-proyecto].supabase.co/functions/v1/campaign-scheduler \
  -H "Authorization: Bearer [tu-anon-key]"
```

## Logs

La función registra:
- Campañas procesadas
- Grupos enviados
- Leads contactados
- Errores encontrados

Revisa los logs en: Supabase Dashboard → Edge Functions → campaign-scheduler → Logs
