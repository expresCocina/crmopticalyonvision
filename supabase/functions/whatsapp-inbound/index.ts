import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ========== MENSAJES DEL CHATBOT ==========
const MESSAGES = {
    MAIN_MENU: `Hola 👋 Bienvenido a Óptica Lyon Visión

¿En qué podemos ayudarte hoy?

Responde con el número de la opción 👇

1️⃣ Examen visual
2️⃣ Lentes formulados
3️⃣ Monturas
4️⃣ Promociones
5️⃣ Ubicación
6️⃣ Hablar con un asesor`,

    EXAMEN_VISUAL: `👁️ Examen visual
Agenda tu cita en la sede de tu preferencia:

1️⃣ Sede Olaya
2️⃣ Sede Centro
3️⃣ Hablar con un asesor`,

    SEDE_OLAYA: `📍 Sede Olaya
Carrera 19C #26A-51 Sur
Barrio Olaya

¿Qué día te gustaría agendar tu examen visual?`,

    SEDE_CENTRO: `📍 Sede Centro
Calle 18 #8-62
Centro Comercial Tower Visión – Local 219 – Óptica Lyon Visión

¿Qué día te gustaría agendar tu examen visual?`,

    LENTES_FORMULADOS: `👓 Lentes formulados
Selecciona el tipo de lente:

1️⃣ Visión sencilla
2️⃣ Fotosensibles
3️⃣ Progresivos
4️⃣ Enviar fórmula
5️⃣ Hablar con un asesor`,

    VISION_SENCILLA: `👓 Lentes visión sencilla

💰 Precios desde:
• Lentes blancos desde $100.000
• Lentes 1.56 con antirreflejo blue desde $140.000
• Lentes en policarbonato con antirreflejo blue desde $190.000
• Lentes evolución con antirreflejo desde $320.000

🛠️ Incluye mantenimiento de lentes y montura totalmente GRATIS.

📸 Si tienes tu fórmula, envíala por aquí y con gusto te cotizamos.`,

    FOTOSENSIBLES: `😎 Lentes fotosensibles

💰 Precios desde:
• Fotosensible 1.56 con antirreflejo desde $220.000
• Fotosensible en policarbonato con antirreflejo desde $290.000

🛠️ Incluye mantenimiento de lentes y montura totalmente GRATIS.

📸 Envíanos tu fórmula para cotizarte exactamente lo que necesitas.`,

    PROGRESIVOS: `👓 Lentes progresivos

💰 Precios desde:
• Progresivos gama media desde $300.000
• Progresivos fotosensibles desde $500.000

🛠️ Incluye mantenimiento de lentes y montura totalmente GRATIS.

📸 Si tienes fórmula, envíala y te asesoramos.`,

    ENVIAR_FORMULA: `📄 Envío de fórmula
Por favor envía una foto clara de tu fórmula médica y un asesor te cotizará tus lentes.`,

    MONTURAS: `🕶️ Monturas

💰 Precios desde $60.000

🛠️ Incluye mantenimiento totalmente GRATIS.

1️⃣ Ver catálogo
2️⃣ Hablar con un asesor

📲 Catálogo:
👉 https://wa.me/c/573186812518`,

    PROMOCIONES: `🎉 Promociones vigentes
Selecciona la promoción de tu interés 👇

1️⃣ Progresivos Gama Alta
2️⃣ Lentes Transition
3️⃣ Lentes Fotosensibles
4️⃣ Hablar con un asesor`,

    PROMO_1: `🎯 Promoción #1

Por la compra de tus lentes progresivos gama alta,
llévate tu segundo par de lentes para visión lejana totalmente GRATIS.

🛠️ Incluye mantenimiento GRATIS de lentes y montura.`,

    PROMO_2: `🎯 Promoción #2

Por la compra de tus lentes Transition,
lleva tu segundo par de lentes antirreflejo con 50% de descuento.

🛠️ Incluye mantenimiento GRATIS de lentes y montura.`,

    PROMO_3: `🎯 Promoción #3

Por la compra de tus lentes fotosensibles,
llévate tu montura de sol totalmente GRATIS.

🛠️ Incluye mantenimiento GRATIS de lentes y montura.`,

    UBICACION: `📍 Nuestras sedes

🏢 Sede Olaya
Cra 19C #26A-51 Sur – Barrio Olaya

🏢 Sede Centro
Calle 18 #8-62 – Centro Comercial Tower Visión – Local 219 – Óptica Lyon Visión

1️⃣ Hablar con un asesor`,

    HANDOFF: `👩‍⚕️👨‍⚕️ Un asesor de Óptica Lyon Visión te atenderá en un momento.
Por favor escríbenos tu consulta 🙌`,

    INSTITUCIONAL: `¿Quieres conocer más de Óptica Lyon Visión?

📱 TikTok: @lyonvision
📸 Instagram: @Lyon_vision`
}

// ========== SISTEMA DE CONTEXTO (PERSISTIDO EN BD) ==========
interface BotContext {
    menu: string // 'main', 'examen', 'lentes', 'monturas', 'promociones'
    lastMessage: string
}

// Funciones para manejar contexto en la base de datos
async function getContext(supabase: any, leadId: string): Promise<BotContext> {
    const { data } = await supabase
        .from('leads')
        .select('bot_context')
        .eq('id', leadId)
        .single()

    return data?.bot_context || { menu: 'main', lastMessage: '' }
}

async function setContext(supabase: any, leadId: string, context: BotContext) {
    await supabase
        .from('leads')
        .update({ bot_context: context })
        .eq('id', leadId)
}

serve(async (req) => {
    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const body = await req.json()
        console.log('Webhook received:', JSON.stringify(body, null, 2))

        if (body.object !== 'whatsapp_business_account') return new Response('OK', { status: 200 })
        const entry = body.entry?.[0]
        const change = entry?.changes?.[0]
        const value = change?.value

        // ========== PROCESAMIENTO DE ESTADOS (DELIVERED, READ) ==========
        if (value?.statuses && value.statuses.length > 0) {
            console.log('Processing statuses:', JSON.stringify(value.statuses))
            for (const statusUpdate of value.statuses) {
                const wa_message_id = statusUpdate.id
                const newStatus = statusUpdate.status // 'sent', 'delivered', 'read', 'failed'
                let errorMessage = null

                if (newStatus === 'failed') {
                    errorMessage = JSON.stringify(statusUpdate.errors || {})
                    console.error(`Message failed: ${wa_message_id}`, errorMessage)
                }

                // 1. Buscar el mensaje interno
                console.log(`Looking for message with wa_message_id: ${wa_message_id}`)
                const { data: messageRecord, error: lookupError } = await supabase
                    .from('messages')
                    .select('id, wa_message_id, status')
                    .eq('wa_message_id', wa_message_id)
                    .single()

                if (lookupError) {
                    console.error(`Error looking up message: ${lookupError.message}`, lookupError)
                }

                if (messageRecord) {
                    const messageId = messageRecord.id
                    console.log(`Found message ${messageId}, current status: ${messageRecord.status}, updating to: ${newStatus}`)

                    // 2. Actualizar tabla messages
                    const { error: updateError } = await supabase
                        .from('messages')
                        .update({
                            status: newStatus
                            // Note: error_message column will be added in future migration
                        })
                        .eq('id', messageId)

                    if (updateError) {
                        console.error(`Error updating message status: ${updateError.message}`, updateError)
                    } else {
                        console.log(`✅ Successfully updated message ${messageId} to ${newStatus}`)
                    }

                    // 3. Actualizar tabla campaign_sends (si existe)
                    // Esto vinculará automáticamente el estado al historial de campaña
                    const { error: campaignError } = await supabase
                        .from('campaign_sends')
                        .update({ status: newStatus })
                        .eq('message_id', messageId)

                    if (campaignError) console.error('Error updating campaign_sends:', campaignError)

                    console.log(`Updated status for message ${messageId} to ${newStatus}`)
                } else {
                    console.warn(`❌ Message with wa_id ${wa_message_id} not found for status update ${newStatus}`)
                    // Log all recent outbound messages to help debug
                    const { data: recentMessages } = await supabase
                        .from('messages')
                        .select('id, wa_message_id, status')
                        .eq('direction', 'outbound')
                        .order('created_at', { ascending: false })
                        .limit(5)
                    console.log('Recent outbound messages:', JSON.stringify(recentMessages, null, 2))
                }
            }
            return new Response('OK', { status: 200 })
        }

        if (!value?.messages) return new Response('OK', { status: 200 })

        const message = value.messages[0]
        const wa_id = message.from
        const messageType = message.type
        const messageContent = message.text?.body || message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || ''

        // Extract media information (image, video, audio, document)
        let mediaUrl = null
        let caption = null

        if (messageType === 'image') {
            const imageId = message.image?.id
            caption = message.image?.caption || null
            if (imageId) {
                // Download image from WhatsApp
                try {
                    const mediaResponse = await fetch(`https://graph.facebook.com/v24.0/${imageId}`, {
                        headers: { 'Authorization': `Bearer ${Deno.env.get('WHATSAPP_API_TOKEN')}` }
                    })
                    const mediaData = await mediaResponse.json()
                    mediaUrl = mediaData.url
                } catch (err) {
                    console.error('Error downloading image:', err)
                }
            }
        }

        // Process audio messages
        if (messageType === 'audio') {
            const audioId = message.audio?.id
            if (audioId) {
                try {
                    const mediaResponse = await fetch(`https://graph.facebook.com/v24.0/${audioId}`, {
                        headers: { 'Authorization': `Bearer ${Deno.env.get('WHATSAPP_API_TOKEN')}` }
                    })
                    const mediaData = await mediaResponse.json()
                    mediaUrl = mediaData.url
                    console.log('Audio message received, URL:', mediaUrl)
                } catch (err) {
                    console.error('Error downloading audio:', err)
                }
            }
        }

        // Extract Profile Name
        const profileName = value.contacts?.[0]?.profile?.name || null

        // 1. Buscar o crear lead
        let { data: lead, error: leadError } = await supabase.from('leads').select('id, full_name, bot_active').eq('wa_id', wa_id).maybeSingle()
        let leadId = lead?.id
        let botActive = lead?.bot_active ?? true

        if (!leadId) {
            // New Lead: Insert with name
            const { data: newLead, error: insertError } = await supabase.from('leads').insert({
                wa_id,
                status: 'nuevo',
                full_name: profileName,
                bot_active: true
            }).select('id, bot_active').single()
            if (insertError) throw insertError
            leadId = newLead.id
            botActive = newLead.bot_active
        } else if (profileName && !lead.full_name) {
            // Existing Lead without name: Update name
            await supabase.from('leads').update({ full_name: profileName }).eq('id', leadId)
        }

        // Guardar mensaje entrante (con media_url si es imagen o audio)
        const displayContent = messageContent || caption || (messageType === 'image' ? '[Imagen]' : messageType === 'audio' ? '[Audio]' : '')

        await supabase.from('messages').insert({
            lead_id: leadId,
            wa_message_id: message.id,
            content: displayContent,
            type: messageType,
            direction: 'inbound',
            status: 'delivered',
            media_url: mediaUrl,
            caption: caption
        })

        // INCREMENTAR CONTADOR DE NO LEÍDOS
        await supabase.rpc('increment_unread_count', { row_id: leadId })

        // SI EL BOT ESTÁ DESACTIVADO, NO RESPONDER
        if (!botActive) {
            console.log('Bot desactivado para este lead, no se envía respuesta automática')
            return new Response('OK', { status: 200 })
        }

        // Función envío WhatsApp + REGISTRO EN CRM
        const sendWhatsApp = async (text: string) => {
            const response = await fetch(`https://graph.facebook.com/v24.0/${Deno.env.get('WHATSAPP_PHONE_ID')}/messages`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${Deno.env.get('WHATSAPP_API_TOKEN')}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ messaging_product: 'whatsapp', to: wa_id, type: 'text', text: { body: text } })
            })
            const data = await response.json()
            if (response.ok) {
                await supabase.from('messages').insert({
                    lead_id: leadId, content: text, type: 'text', direction: 'outbound', status: 'sent', wa_message_id: data.messages?.[0]?.id
                })
            }
        }

        // Función para agregar tags
        const addTag = async (tag: string) => {
            const { data: currentLead } = await supabase.from('leads').select('tags').eq('id', leadId).single()
            const currentTags = currentLead?.tags || []
            if (!currentTags.includes(tag)) {
                await supabase.from('leads').update({ tags: [...currentTags, tag] }).eq('id', leadId)
            }
        }

        // LÓGICA DE RESPUESTA BASADA EN NÚMEROS Y CONTEXTO
        const input = messageContent.trim()
        const context = await getContext(supabase, leadId)

        // Saludos - Mostrar menú principal
        if (['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'menu', 'menú', 'opciones', 'hi', 'hello'].some(g => input.toLowerCase().includes(g))) {
            await sendWhatsApp(MESSAGES.MAIN_MENU)
            await setContext(supabase, leadId, { menu: 'main', lastMessage: 'main_menu' })
            return new Response('OK', { status: 200 })
        }

        // ========== MENÚ PRINCIPAL ==========
        if (context.menu === 'main' || context.lastMessage === 'main_menu') {
            // OPCIÓN 1: EXAMEN VISUAL
            if (input === '1') {
                await addTag('examen_visual')
                await sendWhatsApp(MESSAGES.EXAMEN_VISUAL)
                await setContext(supabase, leadId, { menu: 'examen', lastMessage: 'examen_menu' })
                return new Response('OK', { status: 200 })
            }

            // OPCIÓN 2: LENTES FORMULADOS
            if (input === '2') {
                await addTag('lentes_formulados')
                await sendWhatsApp(MESSAGES.LENTES_FORMULADOS)
                await setContext(supabase, leadId, { menu: 'lentes', lastMessage: 'lentes_menu' })
                return new Response('OK', { status: 200 })
            }

            // OPCIÓN 3: MONTURAS
            if (input === '3') {
                await addTag('monturas')
                await sendWhatsApp(MESSAGES.MONTURAS)
                await setContext(supabase, leadId, { menu: 'monturas', lastMessage: 'monturas_menu' })
                return new Response('OK', { status: 200 })
            }

            // OPCIÓN 4: PROMOCIONES
            if (input === '4') {
                await addTag('promociones')
                await sendWhatsApp(MESSAGES.PROMOCIONES)
                await setContext(supabase, leadId, { menu: 'promociones', lastMessage: 'promociones_menu' })
                return new Response('OK', { status: 200 })
            }

            // OPCIÓN 5: UBICACIÓN
            if (input === '5') {
                await sendWhatsApp(MESSAGES.UBICACION)
                await setContext(supabase, leadId, { menu: 'ubicacion', lastMessage: 'ubicacion' })
                return new Response('OK', { status: 200 })
            }

            // OPCIÓN 6: HABLAR CON ASESOR (HANDOFF)
            if (input === '6' || input.toLowerCase().includes('asesor')) {
                await addTag('asesor_solicitado')
                await supabase.from('leads').update({ bot_active: false }).eq('id', leadId)
                await sendWhatsApp(MESSAGES.HANDOFF)
                await setContext(supabase, leadId, { menu: 'handoff', lastMessage: 'handoff' })
                return new Response('OK', { status: 200 })
            }
        }

        // ========== SUBMENÚ: EXAMEN VISUAL ==========
        if (context.menu === 'examen') {
            if (input === '1') {
                await addTag('sede_olaya')
                await sendWhatsApp(MESSAGES.SEDE_OLAYA)
                await setContext(supabase, leadId, { menu: 'examen_olaya', lastMessage: 'sede_olaya' })
                return new Response('OK', { status: 200 })
            }

            if (input === '2') {
                await addTag('sede_centro')
                await sendWhatsApp(MESSAGES.SEDE_CENTRO)
                await setContext(supabase, leadId, { menu: 'examen_centro', lastMessage: 'sede_centro' })
                return new Response('OK', { status: 200 })
            }

            if (input === '3' || input.toLowerCase().includes('asesor')) {
                await addTag('asesor_solicitado')
                await supabase.from('leads').update({ bot_active: false }).eq('id', leadId)
                await sendWhatsApp(MESSAGES.HANDOFF)
                return new Response('OK', { status: 200 })
            }
        }

        // ========== DESPUÉS DE SELECCIONAR SEDE: CAPTURAR FECHA ==========
        if (context.menu === 'examen_olaya' || context.menu === 'examen_centro') {
            // El usuario respondió con una fecha/día
            // Guardar en notes y transferir a asesor para confirmar cita
            const sede = context.menu === 'examen_olaya' ? 'Olaya' : 'Centro'
            const fechaSolicitada = input

            // Actualizar notes con la información
            const { data: currentLead } = await supabase.from('leads').select('notes').eq('id', leadId).single()
            const currentNotes = currentLead?.notes || ''
            const newNotes = `${currentNotes}\n\nExamen Visual - Sede ${sede}\nFecha solicitada: ${fechaSolicitada}`.trim()

            await supabase.from('leads').update({ notes: newNotes }).eq('id', leadId)
            await addTag('cita_solicitada')
            await addTag(`sede_${sede.toLowerCase()}`)

            // Transferir a asesor para confirmar
            await supabase.from('leads').update({ bot_active: false }).eq('id', leadId)
            await sendWhatsApp(`Perfecto! Un asesor te contactará pronto para confirmar tu cita de examen visual en la sede ${sede} para el ${fechaSolicitada}. 📅👁️`)

            return new Response('OK', { status: 200 })
        }

        // ========== SUBMENÚ: LENTES FORMULADOS ==========
        if (context.menu === 'lentes') {
            if (input === '1') {
                await addTag('vision_sencilla')
                await sendWhatsApp(MESSAGES.VISION_SENCILLA)
                await setContext(supabase, leadId, { menu: 'main', lastMessage: 'vision_sencilla' })
                return new Response('OK', { status: 200 })
            }

            if (input === '2') {
                await addTag('fotosensible')
                await sendWhatsApp(MESSAGES.FOTOSENSIBLES)
                await setContext(supabase, leadId, { menu: 'main', lastMessage: 'fotosensibles' })
                return new Response('OK', { status: 200 })
            }

            if (input === '3') {
                await addTag('progresivos')
                await sendWhatsApp(MESSAGES.PROGRESIVOS)
                await setContext(supabase, leadId, { menu: 'main', lastMessage: 'progresivos' })
                return new Response('OK', { status: 200 })
            }

            if (input === '4') {
                await addTag('formula_enviada')
                await sendWhatsApp(MESSAGES.ENVIAR_FORMULA)
                await setContext(supabase, leadId, { menu: 'main', lastMessage: 'enviar_formula' })
                return new Response('OK', { status: 200 })
            }

            if (input === '5' || input.toLowerCase().includes('asesor')) {
                await addTag('asesor_solicitado')
                await supabase.from('leads').update({ bot_active: false }).eq('id', leadId)
                await sendWhatsApp(MESSAGES.HANDOFF)
                return new Response('OK', { status: 200 })
            }
        }

        // ========== SUBMENÚ: MONTURAS ==========
        if (context.menu === 'monturas') {
            if (input === '1') {
                await sendWhatsApp('📲 Aquí está nuestro catálogo de monturas: https://wa.me/c/573186812518')
                await setContext(supabase, leadId, { menu: 'main', lastMessage: 'catalogo' })
                return new Response('OK', { status: 200 })
            }

            if (input === '2' || input.toLowerCase().includes('asesor')) {
                await addTag('asesor_solicitado')
                await supabase.from('leads').update({ bot_active: false }).eq('id', leadId)
                await sendWhatsApp(MESSAGES.HANDOFF)
                return new Response('OK', { status: 200 })
            }
        }

        // ========== SUBMENÚ: PROMOCIONES ==========
        if (context.menu === 'promociones') {
            if (input === '1') {
                await addTag('promocion_1')
                await sendWhatsApp(MESSAGES.PROMO_1)
                await setContext(supabase, leadId, { menu: 'main', lastMessage: 'promo_1' })
                return new Response('OK', { status: 200 })
            }

            if (input === '2') {
                await addTag('promocion_2')
                await sendWhatsApp(MESSAGES.PROMO_2)
                await setContext(supabase, leadId, { menu: 'main', lastMessage: 'promo_2' })
                return new Response('OK', { status: 200 })
            }

            if (input === '3') {
                await addTag('promocion_3')
                await sendWhatsApp(MESSAGES.PROMO_3)
                await setContext(supabase, leadId, { menu: 'main', lastMessage: 'promo_3' })
                return new Response('OK', { status: 200 })
            }

            if (input === '4' || input.toLowerCase().includes('asesor')) {
                await addTag('asesor_solicitado')
                await supabase.from('leads').update({ bot_active: false }).eq('id', leadId)
                await sendWhatsApp(MESSAGES.HANDOFF)
                return new Response('OK', { status: 200 })
            }
        }

        // ========== SUBMENÚ: UBICACIÓN ==========
        if (context.menu === 'ubicacion') {
            if (input === '1' || input.toLowerCase().includes('asesor')) {
                await addTag('asesor_solicitado')
                await supabase.from('leads').update({ bot_active: false }).eq('id', leadId)
                await sendWhatsApp(MESSAGES.HANDOFF)
                return new Response('OK', { status: 200 })
            }
        }

        // Si no es una opción válida, no responder (mensaje libre para asesor)
        console.log('Mensaje no reconocido como opción de menú, esperando intervención humana')

        return new Response('OK', { status: 200 })
    } catch (error) {
        console.error('Error:', error)
        return new Response('Error', { status: 500 })
    }
})