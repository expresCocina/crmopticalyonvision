# CRM Óptica Lyon Visión

Software CRM Single-Tenant desarrollado exclusivamente para Óptica Lyon Visión. Estrictamente privado.

## 🧱 Arquitectura
- **Frontend**: Next.js 14 (App Router)
- **UI**: TailwindCSS + shadcn/ui
- **Base de Datos**: Supabase PostgreSQL
- **Backend**: Supabase Edge Functions (WhatsApp Bot)
- **Estado**: React Query + Context

## 🚀 Despliegue en Vercel (Producción)

1.  Crear nuevo proyecto en Vercel e importar este repositorio.
2.  Configurar **Variables de Entorno** en Vercel:

| Variable | Descripción |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Key `anon` pública de Supabase |

3.  Desplegar.

## 🤖 Configuración del Bot (Supabase Edge Functions)

1.  Asegurarse de haber ejecutado `database/schema.sql` y `database/triggers.sql` en Supabase SQL Editor.
2.  Desplegar funciones:
    ```bash
    supabase functions deploy whatsapp-inbound
    ```
3.  Configurar Secretos de Función (en Dashboard o CLI):
    ```bash
    supabase secrets set WHATSAPP_VERIFY_TOKEN="tu_token_verificacion"
    supabase secrets set WHATSAPP_API_TOKEN="tu_token_meta_permanente"
    supabase secrets set WHATSAPP_PHONE_ID="tu_id_telefono_meta"
    ```
4.  Configurar Webhook en Meta Developers apuntando a la URL de la función:
    `https://[project-ref].supabase.co/functions/v1/whatsapp-inbound`

## ✅ Checklist de Entrega
- [x] Base de Datos Completa + RLS
- [x] Autenticación y Roles
- [x] Dashboard Realtime
- [x] Pipeline Kanban
- [x] Agenda Semanal
- [x] Historia Clínica (OD/OI)
- [x] Registro de Ventas
- [x] Bot de WhatsApp fase 1

## 🛡️ Seguridad
Este sistema utiliza **Row Level Security (RLS)**.
- **Admin**: Acceso total.
- **Vendedor**: Solo ve sus leads asignados o libres.
- **Single-Tenant**: No existe lógica de multi-empresa. Los datos están aislados por diseño.
