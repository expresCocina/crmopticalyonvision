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

        // 4. Lógica de Menú e Inteligencia de Respuestas
        const body = messageContent.trim().toLowerCase()
        let responseText = ''
        if (/hola|buenos|buenas|menu/.test(body)) {
            responseText = `Hola 👋 Bienvenido a Óptica Lyon Visión.\n\n1️⃣ Examen visual\n2️⃣ Lentes formulados\n3️⃣ Monturas\n4️⃣ Promociones`
        } else if (body === '1') {
            responseText = `👁️ ¡Excelente decisión! Dime qué día y hora prefieres para tu examen. Ej: 'Mañana a las 3pm'`
        } else if (body === '2') {
            responseText = `👓 Envíanos una foto de tu receta para cotizar tus lentes.`
        } else if (body === '3') {
            responseText = `🕶️ Tenemos gran variedad de monturas. ¿Buscas algún estilo en particular?`
        } else if (body === '4') {
            responseText = `🔥 ¡Promociones! 2x1 en monturas seleccionadas y examen GRATIS por tu compra.`
        } else if (/precio|costo|cuanto vale/.test(body)) {
            responseText = `Nuestros precios dependen de tus lentes. El examen es GRATIS por la compra de tus gafas. ¿Te agendo una cita?`
        } else if (/ubicacion|donde estan|direccion/.test(body)) {
            responseText = `Estamos ubicados en Neiva, Huila. ¡Visítanos!`
        } else {
            responseText = `Gracias por tu mensaje. Un asesor te atenderá pronto. Si quieres ver las opciones de nuevo, escribe "Hola".`
        }

        if (responseText) await sendWhatsApp(responseText)

        return new Response(JSON.stringify({ status: 'ok' }), { headers: corsHeaders })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
    }
})