// Appointment Intent Detection and Date/Time Parsing
// Funciones helper para detectar intención de agendar y extraer fechas

interface AppointmentIntent {
    hasIntent: boolean
    date?: Date
    time?: string
    rawDate?: string
    rawTime?: string
    appointmentType?: string
}

/**
 * Detecta si el mensaje tiene intención de agendar una cita
 */
export function detectAppointmentIntent(message: string): AppointmentIntent {
    const lowerMessage = message.toLowerCase().trim()

    // Palabras clave para detectar intención de agendar
    const appointmentKeywords = [
        'agendar', 'agenda', 'cita', 'reservar', 'reserva',
        'examen', 'consulta', 'revisión', 'revision',
        'quiero una cita', 'necesito una cita',
        'cuando puedo ir', 'horario disponible'
    ]

    const hasIntent = appointmentKeywords.some(keyword => lowerMessage.includes(keyword))

    if (!hasIntent) {
        return { hasIntent: false }
    }

    // Extraer fecha y hora
    const dateInfo = extractDate(lowerMessage)
    const timeInfo = extractTime(lowerMessage)
    const appointmentType = extractAppointmentType(lowerMessage)

    return {
        hasIntent: true,
        date: dateInfo.date,
        rawDate: dateInfo.raw,
        time: timeInfo.time,
        rawTime: timeInfo.raw,
        appointmentType
    }
}

/**
 * Extrae la fecha del mensaje
 */
function extractDate(message: string): { date?: Date; raw?: string } {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Palabras clave para fechas relativas
    if (message.includes('hoy')) {
        return { date: today, raw: 'hoy' }
    }

    if (message.includes('mañana') || message.includes('manana')) {
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        return { date: tomorrow, raw: 'mañana' }
    }

    if (message.includes('pasado mañana') || message.includes('pasado manana')) {
        const dayAfterTomorrow = new Date(today)
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)
        return { date: dayAfterTomorrow, raw: 'pasado mañana' }
    }

    // Días de la semana
    const daysOfWeek = ['domingo', 'lunes', 'martes', 'miércoles', 'miercoles', 'jueves', 'viernes', 'sábado', 'sabado']
    for (let i = 0; i < daysOfWeek.length; i++) {
        const day = daysOfWeek[i]
        if (message.includes(day)) {
            const targetDay = i
            const currentDay = today.getDay()
            let daysToAdd = targetDay - currentDay

            if (daysToAdd <= 0) {
                daysToAdd += 7 // Próxima semana
            }

            const targetDate = new Date(today)
            targetDate.setDate(targetDate.getDate() + daysToAdd)
            return { date: targetDate, raw: day }
        }
    }

    // Formato: "30 de enero", "15 de febrero"
    const datePattern = /(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i
    const dateMatch = message.match(datePattern)

    if (dateMatch) {
        const day = parseInt(dateMatch[1])
        const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
        const month = monthNames.indexOf(dateMatch[2].toLowerCase())

        const year = today.getFullYear()
        const targetDate = new Date(year, month, day)

        // Si la fecha ya pasó este año, usar el próximo año
        if (targetDate < today) {
            targetDate.setFullYear(year + 1)
        }

        return { date: targetDate, raw: dateMatch[0] }
    }

    // Formato: "30/01", "15/02"
    const shortDatePattern = /(\d{1,2})\/(\d{1,2})/
    const shortDateMatch = message.match(shortDatePattern)

    if (shortDateMatch) {
        const day = parseInt(shortDateMatch[1])
        const month = parseInt(shortDateMatch[2]) - 1
        const year = today.getFullYear()
        const targetDate = new Date(year, month, day)

        if (targetDate < today) {
            targetDate.setFullYear(year + 1)
        }

        return { date: targetDate, raw: shortDateMatch[0] }
    }

    return {}
}

/**
 * Extrae la hora del mensaje
 */
function extractTime(message: string): { time?: string; raw?: string } {
    // Formato: "3pm", "3 pm", "15:00", "3:30pm"
    const timePatterns = [
        /(\d{1,2}):(\d{2})\s*(am|pm)?/i,  // 3:30pm, 15:00
        /(\d{1,2})\s*(am|pm)/i,            // 3pm, 3 pm
        /a\s+las\s+(\d{1,2}):?(\d{2})?/i   // a las 3, a las 3:30
    ]

    for (const pattern of timePatterns) {
        const match = message.match(pattern)
        if (match) {
            let hour = parseInt(match[1])
            const minute = match[2] ? parseInt(match[2]) : 0
            const meridiem = match[3]?.toLowerCase()

            // Convertir a formato 24 horas
            if (meridiem === 'pm' && hour < 12) {
                hour += 12
            } else if (meridiem === 'am' && hour === 12) {
                hour = 0
            }

            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
            return { time: timeString, raw: match[0] }
        }
    }

    return {}
}

/**
 * Extrae el tipo de cita del mensaje
 */
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
    return 'examen_visual' // Default
}

/**
 * Formatea una fecha para mostrar al usuario
 */
export function formatDateForUser(date: Date): string {
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

    const dayName = days[date.getDay()]
    const day = date.getDate()
    const month = months[date.getMonth()]

    return `${dayName} ${day} de ${month}`
}

/**
 * Formatea una hora para mostrar al usuario
 */
export function formatTimeForUser(time: string): string {
    const [hour, minute] = time.split(':').map(Number)

    if (hour < 12) {
        return `${hour}:${minute.toString().padStart(2, '0')} AM`
    } else if (hour === 12) {
        return `12:${minute.toString().padStart(2, '0')} PM`
    } else {
        return `${hour - 12}:${minute.toString().padStart(2, '0')} PM`
    }
}
