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
        'agendar', 'agenda', 'cita', 'reservar', 'reserva',
        'examen', 'consulta', 'revisión', 'revision',
        'quiero una cita', 'necesito una cita',
        'cuando puedo ir', 'horario disponible'
    ]

    const hasIntent = appointmentKeywords.some(keyword => lowerMessage.includes(keyword))

    // FIX CRÍTICO (V3): No retornar early. Buscar fechas/horas siempre.

    const dateInfo = extractDate(lowerMessage)
    const timeInfo = extractTime(lowerMessage)
    const appointmentType = extractAppointmentType(lowerMessage)

    return {
        hasIntent: hasIntent,
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

    // Palabras exactas para evitar falsos positivos
    const words = message.split(/\s+/)

    if (words.includes('hoy')) {
        return { date: new Date(today), raw: 'hoy' }
    }

    if (message.includes('mañana') || message.includes('manana')) {
        // Verificar que no sea parte de otra palabra
        const tomorrow = new Date(today)
        tomorrow.setDate(today.getDate() + 1)
        return { date: tomorrow, raw: 'mañana' }
    }

    if (message.includes('pasado mañana') || message.includes('pasado manana')) {
        const dayAfterTomorrow = new Date(today)
        dayAfterTomorrow.setDate(today.getDate() + 2)
        return { date: dayAfterTomorrow, raw: 'pasado mañana' }
    }

    const daysOfWeek = ['domingo', 'lunes', 'martes', 'miércoles', 'miercoles', 'jueves', 'viernes', 'sábado', 'sabado']
    for (let i = 0; i < daysOfWeek.length; i++) {
        const day = daysOfWeek[i]
        if (message.includes(day)) {
            const targetDay = i
            const currentDay = today.getDay()
            let daysToAdd = targetDay - currentDay

            if (daysToAdd <= 0) {
                daysToAdd += 7
            }

            const targetDate = new Date(today)
            targetDate.setDate(today.getDate() + daysToAdd)
            return { date: targetDate, raw: day }
        }
    }

    const datePattern = /(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i
    const dateMatch = message.match(datePattern)

    if (dateMatch) {
        const day = parseInt(dateMatch[1])
        const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
        const month = monthNames.indexOf(dateMatch[2].toLowerCase())

        let year = now.getFullYear()
        if (month < now.getMonth() || (month === now.getMonth() && day < now.getDate())) {
            year += 1
        }

        const targetDate = new Date(year, month, day)
        return { date: targetDate, raw: dateMatch[0] }
    }

    const shortDatePattern = /(\d{1,2})\/(\d{1,2})/
    const shortDateMatch = message.match(shortDatePattern)

    if (shortDateMatch) {
        const day = parseInt(shortDateMatch[1])
        const month = parseInt(shortDateMatch[2]) - 1

        let year = now.getFullYear()
        if (month < now.getMonth() || (month === now.getMonth() && day < now.getDate())) {
            year += 1
        }

        const targetDate = new Date(year, month, day)
        return { date: targetDate, raw: shortDateMatch[0] }
    }

    return {}
}

function extractTime(message: string): { time?: string; raw?: string } {
    // Pattern 1: HH:MM am/pm
    const pattern1 = /(\d{1,2}):(\d{2})\s*(am|pm)?/i
    const match1 = message.match(pattern1)
    if (match1) {
        let hour = parseInt(match1[1])
        const minute = parseInt(match1[2])
        const meridiem = match1[3]?.toLowerCase()

        if (meridiem === 'pm' && hour < 12) hour += 12
        if (meridiem === 'am' && hour === 12) hour = 0

        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        return { time: timeString, raw: match1[0] }
    }

    // Pattern 2: HH am/pm (sin minutos)
    const pattern2 = /(\d{1,2})\s*(am|pm)/i
    const match2 = message.match(pattern2)
    if (match2) {
        let hour = parseInt(match2[1])
        const minute = 0
        const meridiem = match2[2]?.toLowerCase()

        if (meridiem === 'pm' && hour < 12) hour += 12
        if (meridiem === 'am' && hour === 12) hour = 0

        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        return { time: timeString, raw: match2[0] }
    }

    // Pattern 3: "a las" HH:MM o HH
    const pattern3 = /a\s+las\s+(\d{1,2})(?::(\d{2}))?/i
    const match3 = message.match(pattern3)
    if (match3) {
        let hour = parseInt(match3[1])
        const minute = match3[2] ? parseInt(match3[2]) : 0

        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        return { time: timeString, raw: match3[0] }
    }

    return {}
}

function extractAppointmentType(message: string): string {
    if (message.includes('examen') || message.includes('revision') || message.includes('revisión')) {
        return 'examen_visual'
    }
    if (message.includes('entrega') || message.includes('recoger')) {
        return 'entrega_lentes'
    }
    if (message.includes('seguimiento') || message.includes('control')) {
        return 'seguimiento'
    }
    return 'examen_visual'
}

function formatDateForUser(date: Date): string {
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

    const dayName = days[date.getDay()]
    const day = date.getDate()
    const month = months[date.getMonth()]

    return `${dayName} ${day} de ${month}`
}

function formatTimeForUser(time: string): string {
    const [hour, minute] = time.split(':').map(Number)

    if (hour < 12) {
        return `${hour}:${minute.toString().padStart(2, '0')} AM`
    } else if (hour === 12) {
        return `12:${minute.toString().padStart(2, '0')} PM`
    } else {
        return `${hour - 12}:${minute.toString().padStart(2, '0')} PM`
    }
}

// ========== END APPOINTMENT PARSER ==========

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const url = new URL(req.url)

        if (req.method === 'GET') {
            const mode = url.searchParams.get('hub.mode')
            const token = url.searchParams.get('hub.verify_token')
            const challenge = url.searchParams.get('hub.challenge')

            const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN')

            if (mode === 'subscribe' && token === VERIFY_TOKEN) {
                console.log('Webhook verified successfully')
                return new Response(challenge, {
                    status: 200,
                    headers: { 'Content-Type': 'text/plain' }
                })
            } else {
                console.error('Webhook verification failed')
                return new Response('Forbidden', { status: 403 })
            }
        }

        if (req.method === 'POST') {
            const supabase = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            )

            const payload = await req.json()
            console.log('Received webhook payload:', JSON.stringify(payload, null, 2))

            const entry = payload.entry?.[0]
            const changes = entry?.changes?.[0]
            const value = changes?.value

            if (!value?.messages) {
                console.log('No messages in payload, skipping')
                return new Response(JSON.stringify({ status: 'ok' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                })
            }

            const message = value.messages[0]
            const wa_id = message.from
            const wa_message_id = message.id
            const timestamp = message.timestamp
            const messageType = message.type

            let messageContent = ''
            if (messageType === 'text') {
                messageContent = message.text?.body || ''
            } else if (messageType === 'image') {
                messageContent = '[Imagen recibida]'
            } else {
                messageContent = `[${messageType}]`
            }

            console.log(`Processing message from ${wa_id}: ${messageContent}`)

            const { data: existingLead, error: leadError } = await supabase
                .from('leads')
                .select('id, bot_active, last_agent_interaction')
                .eq('wa_id', wa_id)
                .maybeSingle()

            let leadId = existingLead?.id

            if (!existingLead) {
                const { data: newLead, error: insertError } = await supabase
                    .from('leads')
                    .insert({
                        wa_id,
                        full_name: value.contacts?.[0]?.profile?.name || `Cliente ${wa_id}`,
                        status: 'nuevo',
                        source: 'whatsapp',
                        last_interaction: new Date(parseInt(timestamp) * 1000).toISOString()
                    })
                    .select()
                    .single()

                if (insertError) {
                    console.error('Error creating lead:', insertError)
                    throw insertError
                }

                leadId = newLead.id
                console.log('New lead created:', leadId)
            } else {
                await supabase
                    .from('leads')
                    .update({ last_interaction: new Date(parseInt(timestamp) * 1000).toISOString() })
                    .eq('id', leadId)

                if (existingLead.bot_active === false && existingLead.last_agent_interaction) {
                    const REACTIVATION_HOURS = 2
                    const twoHoursAgo = new Date(Date.now() - REACTIVATION_HOURS * 60 * 60 * 1000)
                    const lastAgentTime = new Date(existingLead.last_agent_interaction)

                    if (lastAgentTime < twoHoursAgo) {
                        console.log(`🔄 Auto-reactivating bot for lead ${leadId}`)

                        await supabase
                            .from('leads')
                            .update({ bot_active: true })
                            .eq('id', leadId)

                        existingLead.bot_active = true

                        await supabase.from('messages').insert({
                            lead_id: leadId,
                            content: '🤖 Bot reactivado automáticamente por inactividad',
                            direction: 'system',
                            type: 'text',
                            status: 'delivered'
                        })
                    }
                }
            }

            const { error: messageError } = await supabase
                .from('messages')
                .upsert({
                    lead_id: leadId,
                    wa_message_id,
                    content: messageContent,
                    type: messageType,
                    direction: 'inbound',
                    status: 'delivered',
                    created_at: new Date(parseInt(timestamp) * 1000).toISOString()
                }, {
                    onConflict: 'wa_message_id',
                    ignoreDuplicates: true
                })

            if (messageError) {
                console.error('Error upserting message:', messageError)
                throw messageError
            }

            console.log('Message saved successfully')

            const { data: settings } = await supabase
                .from('system_settings')
                .select('whatsapp_enabled')
                .single()

            if (settings?.whatsapp_enabled) {
                const currentTags = existingLead?.tags || []

                if (existingLead?.bot_active === false) {
                    console.log('Bot skipped: bot_active is false')
                    return new Response(JSON.stringify({ status: 'ok', note: 'bot_disabled' }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 200,
                    })
                }

                if (currentTags.includes('bot_stop')) {
                    console.log('Bot skipped: Lead has bot_stop tag')
                    return new Response(JSON.stringify({ status: 'ok', note: 'bot_stopped' }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 200,
                    })
                }

                const sendWhatsApp = async (text: string) => {
                    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_ID')
                    const accessToken = Deno.env.get('WHATSAPP_API_TOKEN')

                    console.log(`Attempting to send message to ${wa_id}`)

                    try {
                        const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                messaging_product: 'whatsapp',
                                to: wa_id,
                                type: 'text',
                                text: { body: text }
                            })
                        })

                        const data = await response.json()
                        console.log('WhatsApp API Response:', response.status, JSON.stringify(data))

                        if (!response.ok) {
                            console.error('Failed to send WhatsApp message:', data)
                            await supabase.from('messages').insert({
                                lead_id: leadId,
                                content: text,
                                type: 'text',
                                direction: 'outbound',
                                status: 'failed',
                                wa_message_id: `error-${Date.now()}`
                            })
                            return
                        }

                        await supabase.from('messages').insert({
                            lead_id: leadId,
                            content: text,
                            type: 'text',
                            direction: 'outbound',
                            status: 'sent',
                            wa_message_id: data.messages?.[0]?.id
                        })

                    } catch (error) {
                        console.error('Network error sending WhatsApp message:', error)
                    }
                }

                // ========== APPOINTMENT BOOKING LOGIC (PRIORITY) ==========
                const appointmentIntent = detectAppointmentIntent(messageContent)
                console.log('Appointment intent detected:', appointmentIntent)

                // Si detecta fecha y/u hora, O si tiene una intención explícita de cita que NO sea solo "1"
                // (Para que "1" se maneje específicamente en el menú de abajo con nuestra respuesta personalizada)
                const isExplicitMenuOption1 = messageContent.trim() === '1'

                // Procesar si:
                // 1. Hay fecha u hora (prioridad máxima, ej. "mañana a las 3")
                // 2. O hay palabra clave "cita" Y NO es solo el número "1" (para usar el texto del menú si es "1")
                // PERO: Si el usuario dice "1", queremos que le responda el mensaje especial, NO el genérico de "¿qué día?".
                // Así que si es '1', lo dejamos pasar al bloque de abajo.

                if ((appointmentIntent.date || appointmentIntent.time || (appointmentIntent.hasIntent && !isExplicitMenuOption1))) {

                    if (appointmentIntent.date && appointmentIntent.time) {
                        const [hours, minutes] = appointmentIntent.time.split(':').map(Number)
                        const appointmentDateTime = new Date(appointmentIntent.date)
                        appointmentDateTime.setHours(hours, minutes, 0, 0)

                        const isoDate = appointmentDateTime.toISOString()

                        const { data: availabilityCheck, error: availError } = await supabase
                            .rpc('check_appointment_availability', {
                                requested_date: isoDate,
                                duration_minutes: 30
                            })

                        if (availError) {
                            console.error('Error checking availability:', availError)
                            await sendWhatsApp('Hubo un error al verificar disponibilidad. Por favor intenta de nuevo.')
                            // FIX V5: Agregar return para evitar doble respuesta
                            return new Response(JSON.stringify({ status: 'error', error: availError }), {
                                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                                status: 200,
                            })
                        } else if (availabilityCheck && availabilityCheck.length > 0) {
                            const isAvailable = availabilityCheck[0].available

                            if (isAvailable) {
                                const { data: newAppointment, error: aptError } = await supabase
                                    .from('appointments')
                                    .insert({
                                        lead_id: leadId,
                                        scheduled_at: isoDate,
                                        appointment_type: appointmentIntent.appointmentType || 'examen_visual',
                                        status: 'confirmada',
                                        notes: `Agendada automáticamente vía WhatsApp: ${messageContent}`
                                    })
                                    .select()
                                    .single()

                                if (aptError) {
                                    console.error('Error creating appointment:', aptError)
                                    await sendWhatsApp('Hubo un error al crear la cita. Por favor contacta con nosotros.')
                                    // FIX V5: Agregar return para evitar doble respuesta
                                    return new Response(JSON.stringify({ status: 'error', error: aptError }), {
                                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                                        status: 200,
                                    })
                                } else {
                                    await supabase
                                        .from('leads')
                                        .update({ status: 'agendado' })
                                        .eq('id', leadId)

                                    const confirmationMessage = `✅ ¡Cita confirmada!

📅 Fecha: ${formatDateForUser(appointmentIntent.date)}
🕐 Hora: ${formatTimeForUser(appointmentIntent.time)}
📍 Óptica Lyon Visión

Te esperamos! Si necesitas cambiar tu cita, avísanos.`

                                    await sendWhatsApp(confirmationMessage)

                                    await supabase.from('messages').insert({
                                        lead_id: leadId,
                                        content: '🤖 Sistema: Cita agendada automáticamente',
                                        direction: 'system',
                                        type: 'text',
                                        status: 'delivered'
                                    })

                                    return new Response(JSON.stringify({ status: 'ok', appointment_created: true }), {
                                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                                        status: 200,
                                    })
                                }
                            } else {
                                const targetDate = new Date(appointmentIntent.date)

                                const { data: availableSlots, error: slotsError } = await supabase
                                    .rpc('get_available_slots', {
                                        target_date: targetDate.toISOString().split('T')[0],
                                        start_hour: 9,
                                        end_hour: 18,
                                        slot_duration_minutes: 30
                                    })

                                if (!slotsError && availableSlots && availableSlots.length > 0) {
                                    const availableOptions = availableSlots
                                        .filter((slot: any) => slot.is_available)
                                        .slice(0, 3)
                                        .map((slot: any) => {
                                            const slotTime = new Date(slot.slot_time)
                                            const timeStr = `${slotTime.getHours().toString().padStart(2, '0')}:${slotTime.getMinutes().toString().padStart(2, '0')}`
                                            return `• ${formatTimeForUser(timeStr)}`
                                        })
                                        .join('\n')

                                    const alternativeMessage = `❌ Lo siento, ese horario ya está ocupado.

¿Te sirve alguno de estos horarios disponibles?

${availableOptions}

Responde con el horario que prefieras.`

                                    await sendWhatsApp(alternativeMessage)
                                } else {
                                    await sendWhatsApp('❌ Lo siento, ese horario no está disponible. ¿Podrías sugerir otro día u hora?')
                                }
                                return new Response(JSON.stringify({ status: 'ok', suggested_alternatives: true }), {
                                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                                    status: 200,
                                })
                            }
                        }
                    }
                    else if (appointmentIntent.date && !appointmentIntent.time) {
                        await sendWhatsApp(`Perfecto! ¿A qué hora te gustaría agendar para el ${formatDateForUser(appointmentIntent.date)}?\n\nEjemplo: "3pm" o "15:00"`)
                        return new Response(JSON.stringify({ status: 'ok', awaiting_time: true }), {
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                            status: 200,
                        })
                    }
                    else if (!appointmentIntent.date && appointmentIntent.time) {
                        await sendWhatsApp(`Entendido, a las ${formatTimeForUser(appointmentIntent.time)}. ¿Qué día te gustaría agendar?\n\nEjemplo: "mañana", "lunes", "30 de enero"`)
                        return new Response(JSON.stringify({ status: 'ok', awaiting_date: true }), {
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                            status: 200,
                        })
                    }
                    else if (appointmentIntent.hasIntent) {
                        await sendWhatsApp('¡Perfecto! ¿Qué día y hora te gustaría agendar?\n\nEjemplo: "mañana a las 3pm" o "lunes 29 a las 10am"')
                        return new Response(JSON.stringify({ status: 'ok', awaiting_datetime: true }), {
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                            status: 200,
                        })
                    }
                }
                // ========== END APPOINTMENT LOGIC ==========

                // ========== MENU & CHAT LOGIC (RESTORED) ==========
                const body = messageContent.trim().toLowerCase()
                let responseText = ''

                // Menú Principal (Restaurado)
                if (body.includes('hola') || body.includes('buenos') || body.includes('buenas') || body === 'menu') {
                    responseText = `Hola 👋 gracias por escribir a Óptica Lyon Visión.

¿En qué podemos ayudarte hoy?

1️⃣ Examen visual
2️⃣ Lentes formulados
3️⃣ Monturas
4️⃣ Promociones

Responde con el número de tu interés.`
                }

                // Opción 1: Examen Visual (Conecta con agendamiento)
                else if (body === '1' || body.includes('examen')) {
                    responseText = `👁️ ¡Excelente decisión! Para agendar tu *Examen Visual*, por favor indícanos qué día y hora te convendría. Nuestro equipo confirmará la disponibilidad enseguida.

_Ejemplo: "Mañana a las 3pm"_`
                }

                // Opción 2: Lentes Formulados
                else if (body === '2' || body.includes('lentes')) {
                    responseText = `👓 Para cotizar tus lentes formulados, necesitamos tu receta.
                    
¿Podrías enviarnos una foto de tu receta médica? Si no la tienes, puedes elegir la opción 1 para agendar un examen.`
                }

                // Opción 3: Monturas
                else if (body === '3' || body.includes('montura')) {
                    responseText = `Tenemos una gran variedad de monturas de moda y clásicas. 🕶️
                    
¿Buscas algún estilo en particular? (Metálicas, acetato, redondas, cuadradas...)`
                }

                // Opción 4: Promociones
                else if (body === '4' || body.includes('promo')) {
                    responseText = `🔥 ¡Promociones del mes!
                    
- 2x1 en monturas seleccionadas
- Examen visual GRATIS con la compra de tus lentes
- 20% de descuento en lentes Blue Block`
                }

                // Fallback / Otros
                else if (body.includes('precio') || body.includes('costo')) {
                    responseText = 'Nuestros precios varían según el tipo de lentes y monturas. ¿Te gustaría agendar una cita para un examen visual? Es completamente gratis (Opción 1).'
                } else if (body.includes('ubicacion') || body.includes('direccion')) {
                    responseText = 'Estamos ubicados en [Tu dirección aquí].'
                } else if (!appointmentIntent.hasIntent && !appointmentIntent.date && !appointmentIntent.time) {
                    // Solo responde genérico si NO es un intento de cita que ya fue procesado arriba
                    responseText = 'Gracias por tu mensaje. Un asesor te atenderá pronto. Si deseas ver las opciones nuevamente, escribe "Hola".'
                }

                if (responseText) {
                    await sendWhatsApp(responseText)
                }
            }

            return new Response(JSON.stringify({ status: 'ok' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        return new Response('Method not allowed', { status: 405 })

    } catch (error) {
        console.error('Error processing webhook:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
