# 🤖 Guía de Despliegue del Chatbot - Óptica Lyon Visión

## Paso 1: Aplicar Migraciones de Base de Datos

### 1.1 Agregar columnas bot_active y unread_count

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Navega a **SQL Editor**
3. Copia y pega el contenido completo del archivo `database/add_bot_control.sql`
4. Haz clic en **Run** para ejecutar la migración

**Qué hace esta migración:**
- Agrega columna `bot_active` (boolean) para controlar si el bot responde automáticamente
- Agrega columna `unread_count` (integer) para contar mensajes no leídos
- Crea función RPC `increment_unread_count` para incrementar contador atómicamente
- Actualiza leads existentes con valores por defecto

### 1.2 Actualizar trigger de reactivación del bot

1. En el mismo **SQL Editor** de Supabase
2. Copia y pega el contenido completo del archivo `database/bot_reactivation_trigger.sql`
3. Haz clic en **Run** para ejecutar

**Qué hace este trigger:**
- Desactiva automáticamente el bot cuando un agente envía un mensaje
- Actualiza el timestamp `last_agent_interaction`

---

## Paso 2: Desplegar Edge Functions

### 2.1 Desplegar whatsapp-inbound

```powershell
supabase functions deploy whatsapp-inbound
```

**Qué hace esta función:**
- Recibe mensajes de WhatsApp
- Implementa navegación por menú numérico (1-6)
- Gestiona contexto de conversación
- Asigna tags automáticamente según flujo
- Desactiva bot en transferencia a asesor

### 2.2 Desplegar whatsapp-outbound

```powershell
supabase functions deploy whatsapp-outbound
```

**Qué hace esta función:**
- Envía mensajes de WhatsApp desde el CRM
- Desactiva bot automáticamente cuando agente envía mensaje
- Actualiza timestamp de última interacción

---

## Paso 3: Verificación

### 3.1 Prueba el Menú Principal

Envía "hola" a tu número de WhatsApp Business. Deberías recibir:

```
Hola 👋 Bienvenido a Óptica Lyon Visión

¿En qué podemos ayudarte hoy?

Responde con el número de la opción 👇

1️⃣ Examen visual
2️⃣ Lentes formulados
3️⃣ Monturas
4️⃣ Promociones
5️⃣ Ubicación
6️⃣ Hablar con un asesor
```

### 3.2 Prueba la Navegación

**Opción 1 - Examen Visual:**
1. Envía "1"
2. Deberías ver opciones de sede (Olaya/Centro)
3. Envía "1" o "2" para seleccionar sede
4. Verifica que se asigne el tag correspondiente en el CRM

**Opción 2 - Lentes Formulados:**
1. Envía "2"
2. Deberías ver opciones de tipo de lente (1-5)
3. Prueba cada opción
4. Verifica tags: `vision_sencilla`, `fotosensible`, `progresivos`

**Opción 4 - Promociones:**
1. Envía "4"
2. Deberías ver 4 opciones de promociones
3. Prueba cada una
4. Verifica tags: `promocion_1`, `promocion_2`, `promocion_3`

**Opción 6 - Transferencia a Asesor:**
1. Envía "6"
2. Deberías recibir mensaje de transferencia
3. Verifica en el CRM que `bot_active = false`
4. Envía otro mensaje - el bot NO debe responder
5. Verifica que el tag `asesor_solicitado` se haya agregado

### 3.3 Verificar en el CRM

1. Ve al Chat Center en tu CRM
2. Busca el lead de prueba
3. Verifica que:
   - Los mensajes aparecen correctamente
   - Los tags se asignan automáticamente
   - El contador de no leídos funciona
   - El estado del bot se muestra correctamente

---

## Paso 4: Implementación Frontend (Próximo)

Una vez verificado el backend, procederemos con:
- Indicador visual de estado del bot (ON/OFF)
- Botón para activar/desactivar bot manualmente
- Visualización de mensajes multimedia
- Distinción visual entre mensajes del bot y del agente

---

## Solución de Problemas

### El bot no responde
- Verifica que `bot_active = true` en la tabla `leads`
- Revisa los logs de la función `whatsapp-inbound` en Supabase
- Verifica que el webhook de WhatsApp esté configurado correctamente

### Los tags no se asignan
- Verifica que la función `whatsapp-inbound` se desplegó correctamente
- Revisa los logs para ver si hay errores
- Verifica que la columna `tags` existe en la tabla `leads`

### El bot sigue respondiendo después de transferencia
- Verifica que `bot_active = false` después de enviar opción 6
- Revisa el trigger `on_agent_message` en la base de datos
- Verifica que la función `whatsapp-outbound` se desplegó con los cambios

---

## Comandos Útiles

```powershell
# Ver logs de función
supabase functions logs whatsapp-inbound

# Ver logs de función outbound
supabase functions logs whatsapp-outbound

# Verificar estado de funciones
supabase functions list
```
