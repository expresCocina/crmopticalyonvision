import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { detectAppointmentIntent, formatDateForUser, formatTimeForUser } from './appointment-parser.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const url = new URL(req.url)

        // GET: Webhook Verification (Meta)
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

        // POST: Incoming Messages
        if (req.method === 'POST') {
            const supabase = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            )

            const payload = await req.json()
            console.log('Received webhook payload:', JSON.stringify(payload, null, 2))

            // Parse WhatsApp Cloud API payload
            const entry = payload.entry?.[0]
            const changes = entry?.changes?.[0]
            const value = changes?.value

            if (!value?.messages || value.messages.length === 0) {
                console.log('No messages in payload, returning 200')
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
            const messageContent = message.text?.body || message.image?.caption || ''

            // Extract contact name if available
            const contact = value.contacts?.[0]
            const contactName = contact?.profile?.name || null

            console.log(`Processing message from ${wa_id}: ${messageContent}`)

            // 1. Upsert Lead
            const { data: existingLead } = await supabase
                .from('leads')
                .select('id, full_name, tags, bot_active, last_agent_interaction')
                .eq('wa_id', wa_id)
                .single()

            let leadId: string

            if (existingLead) {
                // Update existing lead
                leadId = existingLead.id
                await supabase
                    .from('leads')
                    .update({
                        last_interaction: new Date().toISOString(),
                        full_name: existingLead.full_name || contactName // Keep existing name if set
                    })
                    .eq('id', leadId)

                console.log(`Updated existing lead: ${leadId}`)

                // AUTO-REACTIVATION LOGIC: Check if bot should be reactivated
                if (existingLead.bot_active === false && existingLead.last_agent_interaction) {
                    const REACTIVATION_HOURS = 2
                    const twoHoursAgo = new Date(Date.now() - REACTIVATION_HOURS * 60 * 60 * 1000)
                    const lastAgentTime = new Date(existingLead.last_agent_interaction)

                    if (lastAgentTime < twoHoursAgo) {
                        console.log(`🔄 Auto-reactivating bot for lead ${leadId} (inactive for ${REACTIVATION_HOURS}+ hours)`)

                        await supabase
                            .from('leads')
                            .update({ bot_active: true })
                            .eq('id', leadId)

                        // Update local variable so bot logic runs below
                        existingLead.bot_active = true

                        // Optional: Log reactivation message
                        await supabase.from('messages').insert({
                            lead_id: leadId,
                            content: '🤖 Bot reactivado automáticamente por inactividad',
                            direction: 'system',
                            type: 'text',
                            status: 'delivered'
                        })
                    }
                }
            } else {
                // Create new lead
                const { data: newLead, error: leadError } = await supabase
                    .from('leads')
                    .insert({
                        wa_id,
                        full_name: contactName,
                        status: 'nuevo',
                        source: 'whatsapp',
                        last_interaction: new Date().toISOString()
                    })
                    .select()
                    .single()

                if (leadError) {
                    console.error('Error creating lead:', leadError)
                    throw leadError
                }

                leadId = newLead.id
                console.log(`Created new lead: ${leadId}`)
            }

            // 2. Insert Message (using upsert to handle Meta's duplicate webhook retries)
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

            console.log('Message saved successfully (or already existed)')

            // 3. Check if auto-response is enabled
            const { data: settings } = await supabase
                .from('system_settings')
                .select('whatsapp_enabled')
                .single()

            if (settings?.whatsapp_enabled) {
                // 4. Smart Bot Logic
                const body = messageContent.trim().toLowerCase()
                const currentTags = existingLead?.tags || []

                // STOP CONDITION 1: If bot_active is false (agent took over), ignore bot logic
                if (existingLead?.bot_active === false) {
                    console.log('Bot skipped: bot_active is false (agent handling)')
                    return new Response(JSON.stringify({ status: 'ok', note: 'bot_disabled' }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 200,
                    })
                }

                // STOP CONDITION 2: If already handed off to human via tag, ignore bot logic
                if (currentTags.includes('bot_stop')) {
                    console.log('Bot skipped: Lead has bot_stop tag')
                    return new Response(JSON.stringify({ status: 'ok', note: 'bot_stopped' }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 200,
                    })
                }

                // Helper to send message with error handling (DECLARED FIRST)
                const sendWhatsApp = async (text: string) => {
                    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_ID')
                    const accessToken = Deno.env.get('WHATSAPP_API_TOKEN')

                    // Debug log
                    console.log(`Attempting to send message to ${wa_id} using Phone ID: ${phoneNumberId}`)

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
                            // Log failure to DB so user sees it
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

                        // Log success to DB
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


                // ========== APPOINTMENT BOOKING LOGIC ==========
                const appointmentIntent = detectAppointmentIntent(messageContent)
                console.log('Appointment intent detected:', appointmentIntent)

                if (appointmentIntent.hasIntent) {
                    // Check if we have both date and time
                    if (appointmentIntent.date && appointmentIntent.time) {
                        // Combine date and time
                        const [hours, minutes] = appointmentIntent.time.split(':').map(Number)
                        const appointmentDateTime = new Date(appointmentIntent.date)
                        appointmentDateTime.setHours(hours, minutes, 0, 0)

                        console.log('Checking availability for:', appointmentDateTime.toISOString())

                        // Check availability using SQL function
                        const { data: availabilityCheck, error: availError } = await supabase
                            .rpc('check_appointment_availability', {
                                requested_date: appointmentDateTime.toISOString(),
                                duration_minutes: 30
                            })

                        if (availError) {
                            console.error('Error checking availability:', availError)
                        } else if (availabilityCheck && availabilityCheck.length > 0) {
                            const isAvailable = availabilityCheck[0].available

                            if (isAvailable) {
                                // CREATE APPOINTMENT
                                const { data: newAppointment, error: aptError } = await supabase
                                    .from('appointments')
                                    .insert({
                                        lead_id: leadId,
                                        scheduled_at: appointmentDateTime.toISOString(),
                                        appointment_type: appointmentIntent.appointmentType || 'examen_visual',
                                        status: 'confirmada',
                                        notes: `Agendada automáticamente vía WhatsApp: ${messageContent}`
                                    })
                                    .select()
                                    .single()

                                if (aptError) {
                                    console.error('Error creating appointment:', aptError)
                                } else {
                                    console.log('Appointment created successfully:', newAppointment)

                                    // UPDATE LEAD STATUS TO 'agendado'
                                    await supabase
                                        .from('leads')
                                        .update({ status: 'agendado' })
                                        .eq('id', leadId)

                                    // SEND CONFIRMATION MESSAGE
                                    const confirmationMessage = `✅ ¡Cita confirmada!

📅 Fecha: ${formatDateForUser(appointmentIntent.date)}
🕐 Hora: ${formatTimeForUser(appointmentIntent.time)}
📍 Óptica Lyon Visión

Te esperamos! Si necesitas cambiar tu cita, avísanos.`

                                    await sendWhatsApp(confirmationMessage)

                                    // Log appointment creation
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
                                // NO AVAILABILITY - Suggest alternative times
                                const targetDate = appointmentIntent.date
                                targetDate.setHours(0, 0, 0, 0)

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
                    } else if (appointmentIntent.date && !appointmentIntent.time) {
                        // Has date but no time - ask for time
                        await sendWhatsApp(`Perfecto! ¿A qué hora te gustaría agendar para el ${formatDateForUser(appointmentIntent.date)}?\n\nEjemplo: "3pm" o "15:00"`)
                        return new Response(JSON.stringify({ status: 'ok', awaiting_time: true }), {
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                            status: 200,
                        })
                    } else if (!appointmentIntent.date && appointmentIntent.time) {
                        // Has time but no date - ask for date
                        await sendWhatsApp(`Entendido, a las ${formatTimeForUser(appointmentIntent.time)}. ¿Qué día te gustaría agendar?\n\nEjemplo: "mañana", "lunes", "30 de enero"`)
                        return new Response(JSON.stringify({ status: 'ok', awaiting_date: true }), {
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                            status: 200,
                        })
                    } else {
                        // Has intent but no date or time - ask for both
                        await sendWhatsApp('¡Perfecto! ¿Qué día y hora te gustaría agendar?\n\nEjemplo: "mañana a las 3pm" o "lunes 29 a las 10am"')
                        return new Response(JSON.stringify({ status: 'ok', awaiting_datetime: true }), {
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                            status: 200,
                        })
                    }
                }
                // ========== END APPOINTMENT BOOKING LOGIC ==========

                // Logic Flow
                let responseText = ''
                let shouldUpdateLead = false
                let newStatus = ''
                let tagToAdd = ''

                // Greetings Keywords
                const greetings = ['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'hi', 'start', 'inicio', 'menu']

                // Handover Keywords
                const humanKeywords = ['humano', 'asesor', 'persona', 'ayuda', 'hablar con alguien']

                if (humanKeywords.some(k => body.includes(k)) || body === '9') {
                    // HANDOVER CASE
                    responseText = '👤 Te estoy contactando con un asesor humano. En breve te responderemos.'
                    shouldUpdateLead = true
                    newStatus = 'interesado'
                    tagToAdd = 'bot_stop' // This stops the bot from replying further

                } else if (['1', 'uno', 'examen'].includes(body)) {
                    responseText = '👁️ ¡Excelente decisión! Para agendar tu *Examen Visual*:\n\n📅 Indícanos qué día y hora prefieres.\n📍 Estamos ubicados en [Tu Dirección].\n\n_Escribe "9" para hablar con un asesor si necesitas ayuda._'
                    shouldUpdateLead = true
                    newStatus = 'interesado'
                    tagToAdd = 'Examen'

                } else if (['2', 'dos', 'lentes'].includes(body)) {
                    responseText = '👓 Entendido. Si tienes tu fórmula médica a la mano, puedes enviarnos una foto por aquí.\n\nSi no, escribe "1" para agendar examen.\n\n_Escribe "9" para hablar con un asesor._'
                    shouldUpdateLead = true
                    newStatus = 'interesado'
                    tagToAdd = 'Lentes'

                } else if (['3', 'tres', 'monturas'].includes(body)) {
                    responseText = '🕶️ ¡Tenemos monturas increíbles! Puedes ver nuestro catálogo en línea aquí: [Link al Catálogo].\n\n¿Buscas algún estilo en particular?\n\n_Escribe "9" para hablar con un asesor._'
                    shouldUpdateLead = true
                    newStatus = 'interesado'
                    tagToAdd = 'Monturas'

                } else if (['4', 'cuatro', 'promociones'].includes(body)) {
                    responseText = '🔥 *Promo del Mes*: 2x1 en monturas seleccionadas y 20% off en lentes BlueProtect. ¡Aprovecha antes de que se agoten!\n\n_Escribe "9" para más detalles con un asesor._'
                    shouldUpdateLead = true
                    newStatus = 'interesado'
                    tagToAdd = 'Promociones'

                } else if (greetings.some(k => body.includes(k)) || existingLead.status === 'nuevo') {
                    // Welcome Menu only on Greeting OR New Lead (first msg)
                    // If it's an existing lead saying something random like "gracias", stay silent.
                    responseText = `Hola 👋 gracias por escribir a *Óptica Lyon Visión*.\n\n¿En qué podemos ayudarte hoy?\n\n1️⃣ Examen visual\n2️⃣ Lentes formulados\n3️⃣ Monturas\n4️⃣ Promociones\n9️⃣ Hablar con Asesor\n\n_Responde con el número de tu interés._`
                }

                // Execute Response ONLY if we matched a rule
                if (responseText && messageType === 'text') {
                    await sendWhatsApp(responseText)

                    if (shouldUpdateLead) {
                        const updates: any = { status: newStatus }
                        if (tagToAdd && !currentTags.includes(tagToAdd)) {
                            updates.tags = [...currentTags, tagToAdd]
                        }

                        await supabase
                            .from('leads')
                            .update(updates)
                            .eq('id', leadId)
                    }
                } else {
                    console.log('Bot ignored message (no rule matched or silent mode)')
                }
            }

            return new Response(
                JSON.stringify({ status: 'success', lead_id: leadId }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                }
            )
        }

        return new Response('Method not allowed', { status: 405 })

    } catch (error) {
        console.error('Error processing webhook:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            }
        )
    }
})
