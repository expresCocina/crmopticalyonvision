import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ========== APPOINTMENT PARSER (INLINE) ==========
interface AppointmentIntent {
    hasIntent: boolean
    date?: Date
    time?: string
    rawDate?: string
    rawTime?: string
    appointmentType?: string
}

function detectAppointmentIntent(message: string): AppointmentIntent {
    const lowerMessage = message.toLowerCase().trim()
    const appointmentKeywords = [
        'agendar', 'agenda', 'cita', 'reservar', 'reserva', 'examen', 'consulta',
        'revisión', 'revision', 'quiero una cita', 'necesito una cita',
        'cuando puedo ir', 'horario disponible', 'turno', 'espacio', 'chequeo'
    ]
    const hasIntent = appointmentKeywords.some(keyword => lowerMessage.includes(keyword))
    const dateInfo = extractDate(lowerMessage)
    const timeInfo = extractTime(lowerMessage)
    const appointmentType = extractAppointmentType(lowerMessage)

    return {
        hasIntent,
        date: dateInfo.date,
        rawDate: dateInfo.raw,
        time: timeInfo.time,
        rawTime: timeInfo.raw,
        appointmentType
    }
}

function extractDate(message: string): { date?: Date; raw?: string } {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const words = message.split(/\s+/)

    if (words.includes('hoy')) return { date: new Date(today), raw: 'hoy' }
    if (message.includes('mañana') || message.includes('manana')) {
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
        return { date: tomorrow, raw: 'mañana' }
    }
    if (message.includes('pasado mañana') || message.includes('pasado manana')) {
        const dayAfterTomorrow = new Date(today); dayAfterTomorrow.setDate(today.getDate() + 2)
        return { date: dayAfterTomorrow, raw: 'pasado mañana' }
    }

    const daysOfWeek = ['domingo', 'lunes', 'martes', 'miércoles', 'miercoles', 'jueves', 'viernes', 'sábado', 'sabado']
    for (let i = 0; i < daysOfWeek.length; i++) {
        if (message.includes(daysOfWeek[i])) {
            let daysToAdd = i - today.getDay()
            if (daysToAdd <= 0) daysToAdd += 7
            const targetDate = new Date(today); targetDate.setDate(today.getDate() + daysToAdd)
            return { date: targetDate, raw: daysOfWeek[i] }
        }
    }

    const dateMatch = message.match(/(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i)
    if (dateMatch) {
        const day = parseInt(dateMatch[1])
        const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
        const month = monthNames.indexOf(dateMatch[2].toLowerCase())
        let year = now.getFullYear()
        if (month < now.getMonth() || (month === now.getMonth() && day < now.getDate())) year += 1
        return { date: new Date(year, month, day), raw: dateMatch[0] }
    }

    const shortDateMatch = message.match(/(\d{1,2})\/(\d{1,2})/)
    if (shortDateMatch) {
        const day = parseInt(shortDateMatch[1]), month = parseInt(shortDateMatch[2]) - 1
        let year = now.getFullYear()
        if (month < now.getMonth() || (month === now.getMonth() && day < now.getDate())) year += 1
        return { date: new Date(year, month, day), raw: shortDateMatch[0] }
    }
    return {}
}

function extractTime(message: string): { time?: string; raw?: string } {
    const match = message.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i) || message.match(/(\d{1,2})\s*(am|pm)/i)
    if (match) {
        let hour = parseInt(match[1]), minute = match[2] && !isNaN(parseInt(match[2])) ? parseInt(match[2]) : 0
        const meridiem = (match[3] || (isNaN(parseInt(match[2])) ? match[2] : null))?.toLowerCase()
        if (meridiem === 'pm' && hour < 12) hour += 12
        if (meridiem === 'am' && hour === 12) hour = 0
        return { time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`, raw: match[0] }
    }
    return {}
}

function extractAppointmentType(message: string): string {
    if (/examen|revision|revisión|ojos|vista/.test(message)) return 'examen_visual'
    if (/entrega|recoger|lentes/.test(message)) return 'entrega_lentes'
    return 'examen_visual'
}

function formatDateForUser(date: Date): string {
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    return `${days[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]}`
}

function formatTimeForUser(time: string): string {
    const [hour, minute] = time.split(':').map(Number)
    const suffix = hour >= 12 ? 'PM' : 'AM'
    const h = hour % 12 || 12
    return `${h}:${minute.toString().padStart(2, '0')} ${suffix}`
}

// ========== CONFIGURACIÓN SERVIDOR ==========
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
        const url = new URL(req.url)

        // Webhook Verification (GET)
        if (req.method === 'GET') {
            const mode = url.searchParams.get('hub.mode'), token = url.searchParams.get('hub.verify_token'), challenge = url.searchParams.get('hub.challenge')
            if (mode === 'subscribe' && token === Deno.env.get('WHATSAPP_VERIFY_TOKEN')) return new Response(challenge, { status: 200 })
            return new Response('Forbidden', { status: 403 })
        }

        const payload = await req.json()
        const value = payload.entry?.[0]?.changes?.[0]?.value
        if (!value?.messages) return new Response(JSON.stringify({ status: 'ok' }), { headers: corsHeaders })

        const message = value.messages[0], wa_id = message.from, timestamp = message.timestamp
        const messageContent = message.type === 'text' ? message.text?.body || '' : `[${message.type}]`

        // 1. Manejo de Leads y Mensajes Entrantes
        const { data: lead } = await supabase.from('leads').select('*').eq('wa_id', wa_id).maybeSingle()
        let leadId = lead?.id
        if (!lead) {
            const { data: newLead } = await supabase.from('leads').insert({
                wa_id, full_name: value.contacts?.[0]?.profile?.name || `Cliente ${wa_id}`, status: 'nuevo', source: 'whatsapp'
            }).select().single()
            leadId = newLead.id
        }

        // Guardar mensaje entrante para el CRM
        await supabase.from('messages').insert({
            lead_id: leadId, wa_message_id: message.id, content: messageContent, type: message.type, direction: 'inbound', status: 'delivered'
        })

        // INCREMENTAR CONTADOR DE NO LEÍDOS
        await supabase.rpc('increment_unread_count', { row_id: leadId })

        // 2. Función envío WhatsApp + REGISTRO EN CRM
        const sendWhatsApp = async (text: string) => {
            const response = await fetch(`https://graph.facebook.com/v24.0/${Deno.env.get('WHATSAPP_PHONE_ID')}/messages`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${Deno.env.get('WHATSAPP_API_TOKEN')}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ messaging_product: 'whatsapp', to: wa_id, type: 'text', text: { body: text } })
            })
            const data = await response.json()
            if (response.ok) {
                // ESTA LÍNEA ES LA QUE HACE QUE APAREZCA EN EL CRM
                await supabase.from('messages').insert({
                    lead_id: leadId, content: text, type: 'text', direction: 'outbound', status: 'sent', wa_message_id: data.messages?.[0]?.id
                })
            }
        }

        // 3. Lógica de Agendamiento
        const appointmentIntent = detectAppointmentIntent(messageContent)
        if (appointmentIntent.date || appointmentIntent.time || (appointmentIntent.hasIntent && messageContent !== '1')) {
            if (appointmentIntent.date && appointmentIntent.time) {
                const [h, m] = appointmentIntent.time.split(':').map(Number)
                const appointmentDateTime = new Date(appointmentIntent.date); appointmentDateTime.setHours(h, m, 0, 0)

                const { data: avail } = await supabase.rpc('check_appointment_availability', { requested_date: appointmentDateTime.toISOString(), duration_minutes: 30 })
                if (avail?.[0]?.available) {
                    await supabase.from('appointments').insert({ lead_id: leadId, scheduled_at: appointmentDateTime.toISOString(), appointment_type: appointmentIntent.appointmentType, status: 'confirmada' })
                    await sendWhatsApp(`✅ ¡Cita confirmada!\n📅 Fecha: ${formatDateForUser(appointmentIntent.date)}\n🕐 Hora: ${formatTimeForUser(appointmentIntent.time)}\n📍 Óptica Lyon Visión. ¡Te esperamos!`)
                    return new Response(JSON.stringify({ status: 'ok' }), { headers: corsHeaders })
                } else {
                    await sendWhatsApp('❌ Lo siento, ese horario ya está ocupado. ¿Podrías sugerir otro momento?')
                    return new Response(JSON.stringify({ status: 'ok' }), { headers: corsHeaders })
                }
            } else if (appointmentIntent.date) {
                await sendWhatsApp(`¡Perfecto! ¿A qué hora te gustaría el ${formatDateForUser(appointmentIntent.date)}?`)
                return new Response(JSON.stringify({ status: 'ok' }), { headers: corsHeaders })
            }
        }

        // 3.5. Obtener contexto de conversación (último mensaje enviado por el bot)
        const { data: lastOutbound } = await supabase
            .from('messages')
            .select('content, created_at')
            .eq('lead_id', leadId)
            .eq('direction', 'outbound')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        const lastAssistantMessage = lastOutbound?.content || ''

        // HELPER: Send Interactive Message
        const sendInteractiveMessage = async (bodyText: string, interactiveData: any) => {
            const messagePayload = {
                messaging_product: 'whatsapp',
                to: wa_id,
                type: 'interactive',
                interactive: {
                    type: interactiveData.type,
                    body: { text: bodyText },
                    action: interactiveData.action
                }
            }

            // Si es list_message, el body text va en 'section' title no aqui, estructura diferente para LIST
            if (interactiveData.type === 'list') {
                messagePayload.interactive.action = {
                    button: interactiveData.action.button,
                    sections: interactiveData.action.sections
                }
            }

            // Log payload for debug
            console.log('Sending Interactive:', JSON.stringify(messagePayload))

            const response = await fetch(`https://graph.facebook.com/v24.0/${Deno.env.get('WHATSAPP_PHONE_ID')}/messages`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${Deno.env.get('WHATSAPP_API_TOKEN')}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(messagePayload)
            })
            const data = await response.json()

            if (response.ok) {
                // Save interactive message for CRM (without technical tags)
                await supabase.from('messages').insert({
                    lead_id: leadId, content: bodyText, type: 'interactive', direction: 'outbound', status: 'sent', wa_message_id: data.messages?.[0]?.id
                })
            } else {
                console.error('Error sending interactive:', data)
                // Fallback to text if interactive fails
                await sendWhatsApp(bodyText)
            }
        }

        // 4. Lógica de Menú e Inteligencia de Respuestas
        const body = messageContent.trim().toLowerCase()
        let handled = false

        // --- DEFINICIÓN DE MENÚ PRINCIPAL (LIST) ---
        const sendMainMenu = async () => {
            await sendInteractiveMessage('Hola 👋 Bienvenido a Óptica Lyon Visión. ¿En qué podemos ayudarte hoy?', {
                type: 'list',
                action: {
                    button: 'Ver Opciones',
                    sections: [
                        {
                            title: 'Nuestros Servicios',
                            rows: [
                                { id: 'menu_examen', title: 'Examen Visual', description: 'Agenda tu cita' },
                                { id: 'menu_lentes', title: 'Lentes Formulados', description: 'Cotiza tu fórmula' },
                                { id: 'menu_monturas', title: 'Monturas', description: 'Estilos y tendencias' },
                                { id: 'menu_promos', title: 'Promociones', description: 'Ofertas especiales' },
                                { id: 'menu_servicios', title: 'Todos los Servicios', description: 'Reparaciones y más' },
                                { id: 'menu_ubicacion', title: 'Ubicación', description: 'Nuestras sedes' }
                            ]
                        },
                        {
                            title: 'Atención Personalizada',
                            rows: [
                                { id: 'action_advisor', title: 'Hablar con Asesor', description: 'Chatea con un experto' }
                            ]
                        }
                    ]
                }
            })
        }

        // --- LÓGICA DE RESPUESTA ---

        // 1. Detección de selección de lista o botón
        let selectedId = ''
        if (message.type === 'interactive') {
            const intType = message.interactive.type
            if (intType === 'list_reply') selectedId = message.interactive.list_reply.id
            if (intType === 'button_reply') selectedId = message.interactive.button_reply.id
        }

        // 2. Mapeo de selecciones a lógica
        if (selectedId === 'menu_examen' || body === '1') {
            await sendInteractiveMessage('👁️ *Para tu examen visual:*', {
                type: 'button',
                action: {
                    buttons: [
                        { type: 'reply', reply: { id: 'exam_yes', title: 'Ya tengo examen' } },
                        { type: 'reply', reply: { id: 'exam_no', title: 'Quiero examen' } }
                    ]
                }
            })
            handled = true
        } else if (selectedId === 'menu_lentes' || body === '2') {
            await sendInteractiveMessage('👓 *Lentes Formulados:*\nEnvíanos una foto de tu receta médica para cotizar tus lentes.', {
                type: 'button',
                action: {
                    buttons: [
                        { type: 'reply', reply: { id: 'action_advisor_sales', title: 'Hablar con Asesor' } }
                    ]
                }
            })
            handled = true
        } else if (selectedId === 'menu_monturas' || body === '3') {
            await sendInteractiveMessage('🕶️ *Monturas:*\nTenemos gran variedad de estilos. ¿Buscas algo en particular?', {
                type: 'button',
                action: {
                    buttons: [
                        { type: 'reply', reply: { id: 'action_advisor_sales', title: 'Ver Catálogo' } }
                    ]
                }
            })
            handled = true
        } else if (selectedId === 'menu_promos' || body === '4') {
            await sendInteractiveMessage(`🔥 *Promociones Especiales:*\n\n🔹 *Progresivos:* 2º par lejos GRATIS.\n🔹 *Transitions:* 2º par antirreflejo 50% OFF.\n🔹 *Fotosensibles:* Montura sol GRATIS.\n\n_Incluye mantenimiento gratis._`, {
                type: 'button',
                action: {
                    buttons: [
                        { type: 'reply', reply: { id: 'action_advisor_promo', title: 'Quiero una Promo' } }
                    ]
                }
            })
            handled = true
        } else if (selectedId === 'menu_servicios' || body === '5') {
            await sendInteractiveMessage(`🛠️ *Servicios:*\n• Exámenes visuales\n• Venta de monturas y lentes\n• Reparaciones\n• Monturas de sol`, {
                type: 'button',
                action: {
                    buttons: [
                        { type: 'reply', reply: { id: 'action_advisor_general', title: 'Más Información' } }
                    ]
                }
            })
            handled = true
        } else if (selectedId === 'menu_ubicacion' || body === '6') {
            await sendInteractiveMessage(`📍 *Sedes:*\n\n1️⃣ *Principal:* Cra. 19C # 26-51, Barrio Rafael Uribe Uribe\n2️⃣ *Centro:* Cl. 18 # 8-62, Bogotá`, {
                type: 'button',
                action: {
                    buttons: [
                        { type: 'reply', reply: { id: 'action_advisor_location', title: 'Ubicación Exacta' } }
                    ]
                }
            })
            handled = true
        } else if (selectedId === 'action_advisor' || selectedId.startsWith('action_advisor_')) {
            // Lógica Inteligente para Asesor
            let contextText = 'Hola, quiero hablar con un asesor.'
            if (lastAssistantMessage.includes('examen')) contextText = 'Hola, quiero agendar un examen visual.'
            if (lastAssistantMessage.includes('Lentes')) contextText = 'Hola, quiero cotizar mis lentes.'
            if (lastAssistantMessage.includes('Promociones')) contextText = 'Hola, me interesan las promociones.'
            if (selectedId === 'action_advisor_location') contextText = 'Hola, necesito la ubicación exacta.'

            const link = `https://wa.me/573186812518?text=${encodeURIComponent(contextText)}`
            await sendWhatsApp(`💬 *Contactando Asesor...*\n\nHaz clic aquí para chatear directamente:\n${link}`)
            handled = true
        } else if (selectedId === 'exam_yes' || selectedId === 'exam_no') {
            const messageText = selectedId === 'exam_yes' ? 'Hola, ya tengo mi examen y quiero cotizar lentes.' : 'Hola, quiero agendar un examen visual.'
            const link = `https://wa.me/573186812518?text=${encodeURIComponent(messageText)}`
            await sendWhatsApp(`Perfecto. Un asesor te ayudará con el siguiente paso:\n${link}`)
            handled = true
        }

        // Detección de palabras clave si no es interactivo
        if (!handled) {
            if (/hola|buenos|buenas|menu/.test(body)) {
                await sendMainMenu()
                handled = true
            } else if (/ubicacion|donde estan|direccion/.test(body)) {
                // Re-use logic key
                await sendInteractiveMessage(`📍 *Sedes:*\n\n1️⃣ *Principal:* Cra. 19C # 26-51, Barrio Rafael Uribe Uribe\n2️⃣ *Centro:* Cl. 18 # 8-62, Bogotá`, {
                    type: 'button',
                    action: {
                        buttons: [
                            { type: 'reply', reply: { id: 'action_advisor_location', title: 'Ubicación Exacta' } }
                        ]
                    }
                })
                handled = true
            } else if (lastAssistantMessage.includes('Para tu examen visual')) {
                // Fallback for typed numbers in Exam Flow
                if (body === '1') {
                    // Logic for "Ya tengo examen"
                    const link = `https://wa.me/573186812518?text=${encodeURIComponent('Hola, ya tengo mi examen y quiero cotizar lentes.')}`
                    await sendWhatsApp(`Perfecto. Un asesor te ayudará:\n${link}`)
                    handled = true
                } else if (body === '2') {
                    // Logic for "Quiero examen"
                    const link = `https://wa.me/573186812518?text=${encodeURIComponent('Hola, quiero agendar un examen visual.')}`
                    await sendWhatsApp(`Perfecto. Un asesor te ayudará:\n${link}`)
                    handled = true
                }
            }

            // NO DEFAULT FALLBACK - Solo responder cuando el usuario pida ayuda explícitamente
        }

        return new Response(JSON.stringify({ status: 'ok' }), { headers: corsHeaders })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
    }
})
