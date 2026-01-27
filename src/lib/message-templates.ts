export const messageTemplates = {
    // Follow-up templates
    followUp: {
        name: 'Seguimiento General',
        template: '¡Hola {nombre}! 👋 ¿Sigues interesado en {producto}? Estamos aquí para ayudarte.',
        variables: ['nombre', 'producto']
    },

    // Promotion templates
    promotion: {
        name: 'Promoción Especial',
        template: '🎉 ¡Oferta especial para ti{nombre}! {descuento}% de descuento en {producto}. Válido hasta {fecha}.',
        variables: ['nombre', 'descuento', 'producto', 'fecha']
    },

    // Appointment reminder
    appointmentReminder: {
        name: 'Recordatorio de Cita',
        template: 'Hola {nombre}, recordatorio de tu cita el {fecha} a las {hora}. ¿Confirmas tu asistencia? 📅',
        variables: ['nombre', 'fecha', 'hora']
    },

    // Reactivation
    reactivation: {
        name: 'Reactivación de Cliente',
        template: '¡Te extrañamos{nombre}! 😊 Tenemos nuevos productos que te pueden interesar. ¿Quieres conocerlos?',
        variables: ['nombre']
    },

    // New product announcement
    newProduct: {
        name: 'Nuevo Producto',
        template: '✨ ¡Novedad! Tenemos {producto} disponible. {descripcion}. ¿Te interesa conocer más?',
        variables: ['producto', 'descripcion']
    },

    // Abandoned cart
    abandonedCart: {
        name: 'Carrito Abandonado',
        template: 'Hola {nombre}, notamos que te interesó {producto}. ¿Necesitas ayuda para completar tu compra? 🛒',
        variables: ['nombre', 'producto']
    },

    // Thank you message
    thankYou: {
        name: 'Agradecimiento',
        template: '¡Gracias por tu compra{nombre}! 🙏 Esperamos que disfrutes tu {producto}. Si necesitas algo, estamos aquí.',
        variables: ['nombre', 'producto']
    },

    // Feedback request
    feedback: {
        name: 'Solicitud de Opinión',
        template: 'Hola {nombre}, ¿cómo fue tu experiencia con {producto}? Tu opinión es muy importante para nosotros. ⭐',
        variables: ['nombre', 'producto']
    }
}

export type TemplateKey = keyof typeof messageTemplates

export function fillTemplate(templateKey: TemplateKey, variables: Record<string, string>): string {
    const template = messageTemplates[templateKey]
    let message = template.template

    // Replace variables in template
    Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{${key}\\}`, 'g')
        message = message.replace(regex, value || '')
    })

    // Clean up optional name formatting
    message = message.replace(/\{nombre\}/g, variables.nombre ? ` ${variables.nombre}` : '')

    return message
}

export function getTemplateVariables(templateKey: TemplateKey): string[] {
    return messageTemplates[templateKey].variables
}
