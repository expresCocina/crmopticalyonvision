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

    const dayNames = ['lunes', 'martes', 'miercoles', 'miércoles', 'jueves', 'viernes', 'sabado', 'sábado', 'domingo']
    for (const day of dayNames) {
        if (message.includes(day)) {
            const targetDay = ['lunes', 'martes', 'miercoles', 'miércoles', 'jueves', 'viernes', 'sabado', 'sábado', 'domingo'].indexOf(day) % 7
            const currentDay = now.getDay()
            let daysUntil = (targetDay - currentDay + 7) % 7
            if (daysUntil === 0) daysUntil = 7
            const targetDate = new Date(today); targetDate.setDate(today.getDate() + daysUntil)
            return { date: targetDate, raw: day }
        }
    }

    const dateRegex = /(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?/
    const match = message.match(dateRegex)
    if (match) {
        const day = parseInt(match[1])
        const month = parseInt(match[2]) - 1
        const year = match[3] ? (match[3].length === 2 ? 2000 + parseInt(match[3]) : parseInt(match[3])) : now.getFullYear()
        return { date: new Date(year, month, day), raw: match[0] }
    }

    return {}
}

function extractTime(message: string): { time?: string; raw?: string } {
    const timeRegex = /(\d{1,2}):(\d{2})\s*(am|pm)?/i
    const match = message.match(timeRegex)
    if (match) {
        let hours = parseInt(match[1])
        const minutes = match[2]
        const period = match[3]?.toLowerCase()
        if (period === 'pm' && hours < 12) hours += 12
        if (period === 'am' && hours === 12) hours = 0
        return { time: `${hours.toString().padStart(2, '0')}:${minutes}`, raw: match[0] }
    }

    const simpleTimeRegex = /(\d{1,2})\s*(am|pm)/i
    const simpleMatch = message.match(simpleTimeRegex)
    if (simpleMatch) {
        let hours = parseInt(simpleMatch[1])
        const period = simpleMatch[2].toLowerCase()
        if (period === 'pm' && hours < 12) hours += 12
        if (period === 'am' && hours === 12) hours = 0
        return { time: `${hours.toString().padStart(2, '0')}:00`, raw: simpleMatch[0] }
    }

    return {}
}

function extractAppointmentType(message: string): string | undefined {
    if (message.includes('examen') || message.includes('revision')) return 'Examen Visual'
    if (message.includes('lentes') || message.includes('formula')) return 'Cotización Lentes'
    if (message.includes('montura')) return 'Monturas'
    return undefined
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
        if (!value?.messages) return new Response('OK', { status: 200 })

        const message = value.messages[0]
        const wa_id = message.from
        const messageContent = message.text?.body || message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || ''

        // 1. Buscar o crear lead
        let { data: lead, error: leadError } = await supabase.from('leads').select('id').eq('wa_id', wa_id).maybeSingle()
        let leadId = lead?.id
        if (!leadId) {
            const { data: newLead, error: insertError } = await supabase.from('leads').insert({ wa_id, status: 'nuevo' }).select('id').single()
            if (insertError) throw insertError
            leadId = newLead.id
        }

        // Guardar mensaje entrante
        await supabase.from('messages').insert({
            lead_id: leadId, wa_message_id: message.id, content: messageContent, type: message.type, direction: 'inbound', status: 'delivered'
        })

        // INCREMENTAR CONTADOR DE NO LEÍDOS
        await supabase.rpc('increment_unread_count', { row_id: leadId })

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

        // MENÚ PRINCIPAL
        const sendMainMenu = async () => {
            await sendWhatsApp(`Hola 👋 Bienvenido a Óptica Lyon Visión.

¿En qué podemos ayudarte?

1️⃣ Examen Visual
2️⃣ Lentes Formulados  
3️⃣ Monturas
4️⃣ Promociones
5️⃣ Ubicación
6️⃣ Hablar con Asesor

Escribe el número de tu opción.`)
        }

        // LÓGICA DE RESPUESTA
        const body_lower = messageContent.trim().toLowerCase()
        let handled = false

        // Saludos
        if (['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'menu', 'menú', 'opciones'].some(g => body_lower.includes(g))) {
            await sendMainMenu()
            handled = true
        }
        // Opción 1: Examen Visual
        else if (body_lower === '1') {
            await sendWhatsApp(`👁️ Examen Visual

Agenda tu cita escribiendo:
- Fecha (ej: "mañana", "viernes", "15/02")
- Hora (ej: "10am", "3:30pm")

O escribe "6" para hablar con un asesor.`)
            handled = true
        }
        // Opción 2: Lentes Formulados
        else if (body_lower === '2') {
            await sendWhatsApp(`👓 Lentes Formulados

Envíanos una foto de tu receta médica para cotizar tus lentes.

O escribe "6" para hablar con un asesor.`)
            handled = true
        }
        // Opción 3: Monturas
        else if (body_lower === '3') {
            await sendWhatsApp(`🕶️ Monturas

Tenemos gran variedad de estilos.

Escribe "6" para ver el catálogo con un asesor.`)
            handled = true
        }
        // Opción 4: Promociones
        else if (body_lower === '4') {
            await sendWhatsApp(`🔥 Promociones Especiales

👓 Por la compra de tus lentes Progresivos Gama Alta lleva tu 2do par de lentes solo para vision lejana

👓 Por la compra de tus lentes Transition lleva tu 2do par de lentes antireflejo con un 50% de descuento

👓 Por la compra de tus lentes fotosensibles lleva tu montura de sol totalmente gratis

✨ Todas las promociones incluyen mantenimiento de tus lentes y montura totalmente gratis

Escribe "6" para mas informacion.`)
            handled = true
        }
        // Opción 5: Ubicación
        else if (body_lower === '5' || body_lower.includes('ubicacion') || body_lower.includes('ubicación') || body_lower.includes('direccion') || body_lower.includes('dirección')) {
            await sendWhatsApp(`📍 Nuestras Sedes

1️⃣ Principal: Cra. 19C # 26-51
   Barrio Rafael Uribe Uribe

2️⃣ Centro: Cl. 18 # 8-62
   Bogotá

Escribe "6" para más información.`)
            handled = true
        }
        // Opción 6: Hablar con Asesor
        else if (body_lower === '6' || body_lower.includes('asesor')) {
            await sendWhatsApp(`💬 Un asesor te atenderá pronto.

Escríbenos: wa.me/573186812518`)
            handled = true
        }

        return new Response('OK', { status: 200 })
    } catch (error) {
        console.error('Error:', error)
        return new Response('Error', { status: 500 })
    }
})