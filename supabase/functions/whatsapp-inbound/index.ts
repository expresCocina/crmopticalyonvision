import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ========== MENSAJES DEL CHATBOT (OPTIMIZADOS - CORTOS) ==========
const MESSAGES = {
    MAIN_MENU: `Hola 👋 Soy el asistente de Óptica Lyon Visión.
Para ayudarte más rápido, responde con el número 👇

1️⃣ Cotizar lentes formulados
2️⃣ Progresivos / Bifocal invisible
3️⃣ Examen visual
4️⃣ Ubicación Bogotá (sedes)
5️⃣ Hablar con un asesor`,

    RETRY_NUMERIC: `¿Me ayudas con un número del 1 al 5 para guiarte? 👇`,

    // === FLUJO 1: LENTES FORMULADOS ===
    LENTES_HAS_PRESCRIPTION: `¿Tienes fórmula?
1️⃣ Sí, la tengo
2️⃣ No, necesito examen`,

    LENTES_SEND_PRESCRIPTION: `Perfecto ✅ Envíame una foto clara de tu fórmula 📸`,

    LENTES_NEED_EXAM: `Te hacemos el examen visual por $50.000 (si compras tus lentes, te sale GRATIS). ¿Quieres agendar?
1️⃣ Sí
2️⃣ No`,

    LENTES_CITY: `¿En qué ciudad estás?
1️⃣ Bogotá
2️⃣ Otra ciudad`,

    LENTES_OTHER_CITY: `Nuestras sedes están en Bogotá. Si estás fuera, también podemos orientarte y manejar envío según el caso. ¿Deseas continuar?
1️⃣ Sí
2️⃣ No`,

    LENTES_TYPE: `¿Qué buscas para tus lentes?
1️⃣ Antirreflejo + Blu Block
2️⃣ Fotosensible
3️⃣ Premium alto índice`,

    LENTES_BUDGET: `¿En qué rango te quieres mover?
1️⃣ $250k–$400k
2️⃣ $400k–$700k
3️⃣ $700k–$1.2M
4️⃣ +$1.2M`,

    // === FLUJO 2: PROGRESIVOS ===
    PROGRESIVOS_EXPERIENCE: `¿Ya has usado progresivos antes?
1️⃣ Sí
2️⃣ No, primera vez`,

    PROGRESIVOS_SEND_PRESCRIPTION: `Envíame una foto clara de tu fórmula 📸`,

    PROGRESIVOS_BUDGET: `¿Qué presupuesto tienes para progresivos?
1️⃣ $650k–$900k
2️⃣ $900k–$1.2M
3️⃣ +$1.2M`,

    // === FLUJO 3: EXAMEN VISUAL ===
    EXAMEN_SEDE: `¿En qué sede te queda mejor?
1️⃣ Olaya
2️⃣ Centro`,

    EXAMEN_FECHA: `¿Qué día y jornada prefieres?
1️⃣ Hoy / mañana en la mañana
2️⃣ Hoy / mañana en la tarde
3️⃣ Esta semana (indica el día)`,

    EXAMEN_CONFIRMACION: `Listo ✅ El examen cuesta $50.000 y si compras tus lentes, te queda en $0. Un asesor te confirma tu cita.`,

    // === UBICACIÓN ===
    UBICACION: `📍 Nuestras sedes en Bogotá:

🏢 Sede Olaya
Cra 19C #26A-51 Sur – Barrio Olaya

🏢 Sede Centro
Calle 18 #8-62 – Centro Comercial Tower Visión – Local 219`,

    // === HANDOFF ===
    HANDOFF: `👩‍⚕️ Un asesor te atenderá en un momento.
Por favor escríbenos tu consulta 🙌`,

    // === CIERRE POR NO RESPUESTA ===
    CLOSE_NO_RESPONSE: `Cuando quieras retomar, responde con un número del 1 al 5 y seguimos 😊`
}

// ========== SISTEMA DE CONTEXTO EXPANDIDO ==========
interface BotContext {
    menu: string
    lastMessage: string
    step: number
    retryCount: number
    qualificationData: Record<string, any>
}

async function getContext(supabase: any, leadId: string): Promise<BotContext> {
    const { data } = await supabase
        .from('leads')
        .select('bot_context')
        .eq('id', leadId)
        .single()

    return data?.bot_context || {
        menu: 'main',
        lastMessage: '',
        step: 0,
        retryCount: 0,
        qualificationData: {}
    }
}

async function setContext(supabase: any, leadId: string, context: BotContext) {
    await supabase
        .from('leads')
        .update({ bot_context: context })
        .eq('id', leadId)
}

async function saveQualificationData(supabase: any, leadId: string, data: Record<string, any>) {
    console.log('[saveQualificationData] Called with:', { leadId, data })

    const { data: currentLead, error: selectError } = await supabase
        .from('leads')
        .select('qualification_data')
        .eq('id', leadId)
        .single()

    console.log('[saveQualificationData] Current data:', currentLead?.qualification_data)
    console.log('[saveQualificationData] Select error:', selectError)

    const updatedData = { ...(currentLead?.qualification_data || {}), ...data }
    console.log('[saveQualificationData] Updated data (merged):', updatedData)

    const { data: updateResult, error: updateError } = await supabase
        .from('leads')
        .update({ qualification_data: updatedData })
        .eq('id', leadId)

    console.log('[saveQualificationData] Update result:', updateResult)
    console.log('[saveQualificationData] Update error:', updateError)
}

async function calculateScore(qualificationData: Record<string, any>): Promise<number> {
    let score = 0

    // Tiene fórmula o agendó examen: +30
    if (qualificationData.has_prescription || qualificationData.exam_scheduled) score += 30

    // Ciudad Bogotá: +20
    if (qualificationData.city === 'bogota') score += 20

    // Presupuesto definido: +30
    if (qualificationData.budget_range) score += 30

    // Tipo de lente definido: +20
    if (qualificationData.lens_type) score += 20

    return score
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

        // ========== PROCESAMIENTO DE ESTADOS ==========
        if (value?.statuses && value.statuses.length > 0) {
            console.log('Processing statuses:', JSON.stringify(value.statuses))
            for (const statusUpdate of value.statuses) {
                const wa_message_id = statusUpdate.id
                const newStatus = statusUpdate.status

                const { data: messageRecord } = await supabase
                    .from('messages')
                    .select('id')
                    .eq('wa_message_id', wa_message_id)
                    .single()

                if (messageRecord) {
                    await supabase
                        .from('messages')
                        .update({ status: newStatus })
                        .eq('id', messageRecord.id)
                }
            }
            return new Response('OK', { status: 200 })
        }

        if (!value?.messages) return new Response('OK', { status: 200 })

        const message = value.messages[0]
        const wa_id = message.from
        const messageType = message.type
        const messageContent = message.text?.body || message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || ''

        // Extract media
        let mediaUrl = null
        let caption = null

        if (messageType === 'image') {
            const imageId = message.image?.id
            caption = message.image?.caption || null
            if (imageId) {
                try {
                    const mediaResponse = await fetch(`https://graph.facebook.com/v24.0/${imageId}`, {
                        headers: { 'Authorization': `Bearer ${Deno.env.get('WHATSAPP_API_TOKEN')}` }
                    })
                    const mediaData = await mediaResponse.json()
                    const tempImageUrl = mediaData.url

                    if (tempImageUrl) {
                        const imageResponse = await fetch(tempImageUrl, {
                            headers: { 'Authorization': `Bearer ${Deno.env.get('WHATSAPP_API_TOKEN')}` }
                        })
                        const imageBlob = await imageResponse.blob()
                        const imageBuffer = await imageBlob.arrayBuffer()

                        const fileName = `whatsapp-images/${Date.now()}-${imageId}.jpg`
                        const { data: uploadData, error: uploadError } = await supabase.storage
                            .from('chat-media')
                            .upload(fileName, imageBuffer, {
                                contentType: imageBlob.type || 'image/jpeg',
                                upsert: false
                            })

                        if (!uploadError) {
                            const { data: { publicUrl } } = supabase.storage
                                .from('chat-media')
                                .getPublicUrl(fileName)
                            mediaUrl = publicUrl
                        } else {
                            mediaUrl = tempImageUrl
                        }
                    }
                } catch (err) {
                    console.error('Error downloading/uploading image:', err)
                }
            }
        }

        const profileName = value.contacts?.[0]?.profile?.name || null

        // 1. Buscar o crear lead
        let { data: lead } = await supabase.from('leads').select('id, full_name, bot_active').eq('wa_id', wa_id).maybeSingle()
        let leadId = lead?.id
        let botActive = lead?.bot_active ?? true

        if (!leadId) {
            const { data: newLead } = await supabase.from('leads').insert({
                wa_id,
                status: 'nuevo',
                full_name: profileName,
                bot_active: true,
                archived: false
            }).select('id, bot_active').single()
            leadId = newLead.id
            botActive = newLead.bot_active
        } else {
            const updates: any = {}
            if (profileName && !lead.full_name) updates.full_name = profileName
            updates.archived = false
            if (Object.keys(updates).length > 0) {
                await supabase.from('leads').update(updates).eq('id', leadId)
            }
        }

        // Guardar mensaje entrante
        const displayContent = messageContent || caption || (messageType === 'image' ? '[Imagen]' : '')

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

        await supabase.rpc('increment_unread_count', { row_id: leadId })

        if (!botActive) {
            console.log('Bot desactivado para este lead')
            return new Response('OK', { status: 200 })
        }

        // Función envío WhatsApp
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

        const addTag = async (tag: string) => {
            const { data: currentLead } = await supabase.from('leads').select('tags').eq('id', leadId).single()
            const currentTags = currentLead?.tags || []
            if (!currentTags.includes(tag)) {
                await supabase.from('leads').update({ tags: [...currentTags, tag] }).eq('id', leadId)
            }
        }

        const input = messageContent.trim()
        const context = await getContext(supabase, leadId)

        // Saludos - Mostrar menú principal
        if (['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'menu', 'menú', 'opciones', 'hi', 'hello'].some(g => input.toLowerCase().includes(g))) {
            await sendWhatsApp(MESSAGES.MAIN_MENU)
            await setContext(supabase, leadId, { menu: 'main', lastMessage: 'main_menu', step: 0, retryCount: 0, qualificationData: {} })
            return new Response('OK', { status: 200 })
        }

        // ========== VALIDACIÓN NUMÉRICA Y REINTENTOS ==========
        const isNumeric = /^[1-9]$/.test(input)

        if (!isNumeric && context.menu !== 'waiting_image' && context.menu !== 'examen_fecha_custom') {
            if (context.retryCount >= 2) {
                await sendWhatsApp(MESSAGES.CLOSE_NO_RESPONSE)
                await supabase.from('leads').update({ bot_active: false }).eq('id', leadId)
                return new Response('OK', { status: 200 })
            }

            await sendWhatsApp(MESSAGES.RETRY_NUMERIC)
            await setContext(supabase, leadId, { ...context, retryCount: context.retryCount + 1 })
            return new Response('OK', { status: 200 })
        }

        // Resetear contador de reintentos tras respuesta válida
        if (isNumeric) {
            context.retryCount = 0
        }

        // ========== MENÚ PRINCIPAL ==========
        if (context.menu === 'main' || context.lastMessage === 'main_menu') {
            if (input === '1') {
                // Cotizar lentes formulados
                await addTag('lentes_formulados')
                await sendWhatsApp(MESSAGES.LENTES_HAS_PRESCRIPTION)
                await setContext(supabase, leadId, { menu: 'lentes_formulados', lastMessage: 'has_prescription', step: 1, retryCount: 0, qualificationData: {} })
                return new Response('OK', { status: 200 })
            }

            if (input === '2') {
                // Progresivos
                await addTag('progresivos')
                await sendWhatsApp(MESSAGES.PROGRESIVOS_EXPERIENCE)
                await setContext(supabase, leadId, { menu: 'progresivos', lastMessage: 'experience', step: 1, retryCount: 0, qualificationData: {} })
                return new Response('OK', { status: 200 })
            }

            if (input === '3') {
                // Examen visual
                await addTag('examen_visual')
                await sendWhatsApp(MESSAGES.EXAMEN_SEDE)
                await setContext(supabase, leadId, { menu: 'examen', lastMessage: 'sede', step: 1, retryCount: 0, qualificationData: {} })
                return new Response('OK', { status: 200 })
            }

            if (input === '4') {
                // Ubicación
                await sendWhatsApp(MESSAGES.UBICACION)
                await sendWhatsApp(MESSAGES.HANDOFF)
                await supabase.from('leads').update({ bot_active: false }).eq('id', leadId)
                return new Response('OK', { status: 200 })
            }

            if (input === '5') {
                // Hablar con asesor
                await addTag('asesor_directo')
                await sendWhatsApp(MESSAGES.HANDOFF)
                await supabase.from('leads').update({ bot_active: false }).eq('id', leadId)
                return new Response('OK', { status: 200 })
            }
        }

        // ========== FLUJO 1: LENTES FORMULADOS ==========
        if (context.menu === 'lentes_formulados' || context.menu === 'lentes_formulados_continue') {
            if (context.step === 1 && context.menu === 'lentes_formulados') {
                // ¿Tiene fórmula?
                if (input === '1') {
                    await saveQualificationData(supabase, leadId, { has_prescription: true })
                    await sendWhatsApp(MESSAGES.LENTES_SEND_PRESCRIPTION)
                    await setContext(supabase, leadId, { ...context, menu: 'waiting_image', lastMessage: 'send_prescription', step: 2 })
                    return new Response('OK', { status: 200 })
                }
                if (input === '2') {
                    await saveQualificationData(supabase, leadId, { has_prescription: false })
                    await sendWhatsApp(MESSAGES.LENTES_NEED_EXAM)
                    await setContext(supabase, leadId, { ...context, lastMessage: 'need_exam', step: 2 })
                    return new Response('OK', { status: 200 })
                }
            }

            if (context.step === 2 && context.lastMessage === 'need_exam') {
                if (input === '1') {
                    await saveQualificationData(supabase, leadId, { wants_exam: true })
                    await sendWhatsApp(MESSAGES.EXAMEN_SEDE)
                    await setContext(supabase, leadId, { menu: 'examen', lastMessage: 'sede', step: 1, retryCount: 0, qualificationData: context.qualificationData })
                    return new Response('OK', { status: 200 })
                }
                if (input === '2') {
                    await saveQualificationData(supabase, leadId, { wants_exam: false })
                    await sendWhatsApp(MESSAGES.LENTES_CITY)
                    await setContext(supabase, leadId, { ...context, lastMessage: 'city', step: 3 })
                    return new Response('OK', { status: 200 })
                }
            }

            if (context.step === 3 || (context.menu === 'lentes_formulados_continue' && context.step === 1)) {
                // Ciudad
                if (input === '1') {
                    await saveQualificationData(supabase, leadId, { city: 'bogota' })
                    await addTag('bogota')
                    await sendWhatsApp(MESSAGES.LENTES_TYPE)
                    await setContext(supabase, leadId, { menu: 'lentes_formulados', lastMessage: 'lens_type', step: 4, retryCount: 0, qualificationData: context.qualificationData })
                    return new Response('OK', { status: 200 })
                }
                if (input === '2') {
                    await saveQualificationData(supabase, leadId, { city: 'other' })
                    await addTag('otra_ciudad')
                    await sendWhatsApp(MESSAGES.LENTES_OTHER_CITY)
                    await setContext(supabase, leadId, { menu: 'lentes_formulados', lastMessage: 'other_city_confirm', step: 3.5, retryCount: 0, qualificationData: context.qualificationData })
                    return new Response('OK', { status: 200 })
                }
            }

            if (context.step === 3.5) {
                if (input === '1') {
                    await saveQualificationData(supabase, leadId, { continues_other_city: true })
                    await sendWhatsApp(MESSAGES.LENTES_TYPE)
                    await setContext(supabase, leadId, { ...context, lastMessage: 'lens_type', step: 4 })
                    return new Response('OK', { status: 200 })
                }
                if (input === '2') {
                    await sendWhatsApp(MESSAGES.CLOSE_NO_RESPONSE)
                    await supabase.from('leads').update({ bot_active: false }).eq('id', leadId)
                    return new Response('OK', { status: 200 })
                }
            }

            if (context.step === 4) {
                // Tipo de lente
                const lensTypes = ['antirreflejo', 'fotosensible', 'premium']
                if (['1', '2', '3'].includes(input)) {
                    await saveQualificationData(supabase, leadId, { lens_type: lensTypes[parseInt(input) - 1] })
                    await addTag(lensTypes[parseInt(input) - 1])
                    await sendWhatsApp(MESSAGES.LENTES_BUDGET)
                    await setContext(supabase, leadId, { ...context, lastMessage: 'budget', step: 5 })
                    return new Response('OK', { status: 200 })
                }
            }

            if (context.step === 5) {
                // Presupuesto
                const budgets = ['250-400k', '400-700k', '700k-1.2M', '+1.2M']
                if (['1', '2', '3', '4'].includes(input)) {
                    await saveQualificationData(supabase, leadId, { budget_range: budgets[parseInt(input) - 1] })
                    await addTag(`presupuesto_${budgets[parseInt(input) - 1]}`)

                    // Calcular score y transferir
                    const { data: leadData } = await supabase.from('leads').select('qualification_data').eq('id', leadId).single()
                    console.log('[FINAL] qualification_data before score:', leadData.qualification_data)

                    const score = await calculateScore(leadData.qualification_data)
                    console.log('[FINAL] Calculated score:', score)

                    const { error: scoreUpdateError } = await supabase.from('leads').update({ qualification_score: score, bot_active: false }).eq('id', leadId)
                    console.log('[FINAL] Score update error:', scoreUpdateError)

                    await sendWhatsApp(MESSAGES.HANDOFF)
                    return new Response('OK', { status: 200 })
                }
            }
        }

        // Espera de imagen (fórmula)
        if (context.menu === 'waiting_image') {
            if (messageType === 'image') {
                await addTag('formula_enviada')
                await saveQualificationData(supabase, leadId, { prescription_uploaded: true })
                await sendWhatsApp(MESSAGES.LENTES_CITY)
                await setContext(supabase, leadId, { menu: 'lentes_formulados_continue', lastMessage: 'city', step: 1, retryCount: 0, qualificationData: context.qualificationData })
                return new Response('OK', { status: 200 })
            }
        }

        // ========== FLUJO 2: PROGRESIVOS ==========
        if (context.menu === 'progresivos') {
            if (context.step === 1) {
                // Experiencia
                if (input === '1') {
                    await saveQualificationData(supabase, leadId, { progressive_experience: true })
                    await addTag('progresivos_experiencia')
                } else if (input === '2') {
                    await saveQualificationData(supabase, leadId, { progressive_experience: false })
                    await addTag('progresivos_primera_vez')
                }

                await sendWhatsApp(MESSAGES.PROGRESIVOS_SEND_PRESCRIPTION)
                await setContext(supabase, leadId, { ...context, menu: 'waiting_prescription_progressive', step: 2 })
                return new Response('OK', { status: 200 })
            }
        }

        if (context.menu === 'waiting_prescription_progressive') {
            if (messageType === 'image') {
                await addTag('formula_progresivos_enviada')
                await saveQualificationData(supabase, leadId, { prescription_uploaded: true, has_prescription: true })
                await sendWhatsApp(MESSAGES.PROGRESIVOS_BUDGET)
                await setContext(supabase, leadId, { menu: 'progresivos_budget', lastMessage: 'budget', step: 3, retryCount: 0, qualificationData: context.qualificationData })
                return new Response('OK', { status: 200 })
            }
        }

        if (context.menu === 'progresivos_budget') {
            const budgets = ['650-900k', '900k-1.2M', '+1.2M']
            if (['1', '2', '3'].includes(input)) {
                await saveQualificationData(supabase, leadId, { budget_range: budgets[parseInt(input) - 1], city: 'bogota' })
                await addTag(`presupuesto_${budgets[parseInt(input) - 1]}`)

                // Calcular score y transferir
                const { data: leadData } = await supabase.from('leads').select('qualification_data').eq('id', leadId).single()
                const score = await calculateScore(leadData.qualification_data)
                await supabase.from('leads').update({ qualification_score: score, bot_active: false }).eq('id', leadId)

                await sendWhatsApp(MESSAGES.HANDOFF)
                return new Response('OK', { status: 200 })
            }
        }

        // ========== FLUJO 3: EXAMEN VISUAL ==========
        if (context.menu === 'examen') {
            if (context.step === 1) {
                // Sede
                const sedes = ['olaya', 'centro']
                if (['1', '2'].includes(input)) {
                    await saveQualificationData(supabase, leadId, { exam_location: sedes[parseInt(input) - 1], city: 'bogota' })
                    await addTag(`sede_${sedes[parseInt(input) - 1]}`)
                    await sendWhatsApp(MESSAGES.EXAMEN_FECHA)
                    await setContext(supabase, leadId, { ...context, lastMessage: 'fecha', step: 2 })
                    return new Response('OK', { status: 200 })
                }
            }

            if (context.step === 2) {
                // Fecha
                const preferences = ['today_morning', 'today_afternoon', 'this_week']
                if (['1', '2', '3'].includes(input)) {
                    await saveQualificationData(supabase, leadId, { exam_date_preference: preferences[parseInt(input) - 1], exam_scheduled: true })
                    await addTag('cita_solicitada')

                    if (input === '3') {
                        await sendWhatsApp('¿Qué día de esta semana prefieres?')
                        await setContext(supabase, leadId, { ...context, menu: 'examen_fecha_custom', lastMessage: 'custom_date', step: 3 })
                        return new Response('OK', { status: 200 })
                    }

                    // Calcular score y transferir
                    const { data: leadData } = await supabase.from('leads').select('qualification_data').eq('id', leadId).single()
                    const score = await calculateScore(leadData.qualification_data)
                    await supabase.from('leads').update({ qualification_score: score, bot_active: false }).eq('id', leadId)

                    await sendWhatsApp(MESSAGES.EXAMEN_CONFIRMACION)
                    await sendWhatsApp(MESSAGES.HANDOFF)
                    return new Response('OK', { status: 200 })
                }
            }
        }

        if (context.menu === 'examen_fecha_custom') {
            // Capturar texto libre para el día
            await saveQualificationData(supabase, leadId, { custom_exam_date: input })

            const { data: leadData } = await supabase.from('leads').select('qualification_data').eq('id', leadId).single()
            const score = await calculateScore(leadData.qualification_data)
            await supabase.from('leads').update({ qualification_score: score, bot_active: false }).eq('id', leadId)

            await sendWhatsApp(MESSAGES.EXAMEN_CONFIRMACION)
            await sendWhatsApp(MESSAGES.HANDOFF)
            return new Response('OK', { status: 200 })
        }

        // Si no coincide con nada, no responder
        console.log('Mensaje no reconocido, esperando intervención humana')
        return new Response('OK', { status: 200 })

    } catch (error) {
        console.error('Error:', error)
        return new Response('Error', { status: 500 })
    }
})