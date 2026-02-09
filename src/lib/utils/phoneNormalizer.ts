/**
 * Normaliza números de teléfono al formato internacional de WhatsApp
 * Convierte números locales colombianos al formato +57XXXXXXXXXX
 */

export interface PhoneValidationResult {
    isValid: boolean
    normalized: string | null
    error?: string
}

/**
 * Normaliza un número de teléfono al formato de WhatsApp
 * @param phone - Número de teléfono en cualquier formato
 * @param defaultCountryCode - Código de país por defecto (default: '57' para Colombia)
 * @returns Número normalizado en formato internacional o null si es inválido
 */
export function normalizePhoneNumber(
    phone: string | number,
    defaultCountryCode: string = '57'
): PhoneValidationResult {
    if (!phone) {
        return {
            isValid: false,
            normalized: null,
            error: 'Número vacío'
        }
    }

    // Convertir a string y limpiar
    let cleaned = String(phone)
        .replace(/\s+/g, '') // Eliminar espacios
        .replace(/[-()]/g, '') // Eliminar guiones y paréntesis
        .replace(/\./g, '') // Eliminar puntos
        .replace(/\+/g, '') // Eliminar + temporalmente

    // Si está vacío después de limpiar
    if (!cleaned || cleaned.length === 0) {
        return {
            isValid: false,
            normalized: null,
            error: 'Número inválido después de limpieza'
        }
    }

    // Eliminar ceros iniciales
    cleaned = cleaned.replace(/^0+/, '')

    // Detectar si ya tiene código de país
    let hasCountryCode = false
    let countryCode = defaultCountryCode

    // Patrones comunes de códigos de país
    const countryCodePatterns = [
        { code: '57', pattern: /^57(\d{10})$/ }, // Colombia
        { code: '52', pattern: /^52(\d{10})$/ }, // México
        { code: '1', pattern: /^1(\d{10})$/ },   // USA/Canadá
        { code: '54', pattern: /^54(\d{10})$/ }, // Argentina
        { code: '56', pattern: /^56(\d{9})$/ },  // Chile
    ]

    for (const { code, pattern } of countryCodePatterns) {
        if (pattern.test(cleaned)) {
            hasCountryCode = true
            countryCode = code
            break
        }
    }

    // Si no tiene código de país, agregarlo
    if (!hasCountryCode) {
        // Validar longitud para Colombia (10 dígitos)
        if (defaultCountryCode === '57') {
            if (cleaned.length !== 10) {
                return {
                    isValid: false,
                    normalized: null,
                    error: `Número colombiano debe tener 10 dígitos (tiene ${cleaned.length})`
                }
            }
            // Validar que empiece con 3 (celular)
            if (!cleaned.startsWith('3')) {
                return {
                    isValid: false,
                    normalized: null,
                    error: 'Número colombiano debe empezar con 3'
                }
            }
        }

        cleaned = countryCode + cleaned
    }

    // Validar que solo contenga números
    if (!/^\d+$/.test(cleaned)) {
        return {
            isValid: false,
            normalized: null,
            error: 'El número contiene caracteres no numéricos'
        }
    }

    // Validar longitud mínima y máxima
    if (cleaned.length < 10 || cleaned.length > 15) {
        return {
            isValid: false,
            normalized: null,
            error: `Longitud inválida: ${cleaned.length} dígitos`
        }
    }

    return {
        isValid: true,
        normalized: cleaned
    }
}

/**
 * Normaliza un array de números de teléfono
 * @param phones - Array de números
 * @param defaultCountryCode - Código de país por defecto
 * @returns Array de resultados de validación
 */
export function normalizePhoneNumbers(
    phones: (string | number)[],
    defaultCountryCode: string = '57'
): PhoneValidationResult[] {
    return phones.map(phone => normalizePhoneNumber(phone, defaultCountryCode))
}

/**
 * Formatea un número normalizado para mostrar
 * Ejemplo: 573001234567 -> +57 300 123 4567
 */
export function formatPhoneForDisplay(normalizedPhone: string): string {
    if (!normalizedPhone) return ''

    // Detectar código de país
    let countryCode = ''
    let number = normalizedPhone

    if (normalizedPhone.startsWith('57') && normalizedPhone.length === 12) {
        // Colombia
        countryCode = '+57'
        number = normalizedPhone.slice(2)
        // Formato: +57 300 123 4567
        return `${countryCode} ${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`
    } else if (normalizedPhone.startsWith('52') && normalizedPhone.length === 12) {
        // México
        countryCode = '+52'
        number = normalizedPhone.slice(2)
        return `${countryCode} ${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`
    } else if (normalizedPhone.startsWith('1') && normalizedPhone.length === 11) {
        // USA/Canadá
        countryCode = '+1'
        number = normalizedPhone.slice(1)
        return `${countryCode} (${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`
    }

    // Formato genérico
    return `+${normalizedPhone}`
}
