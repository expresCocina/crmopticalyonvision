/**
 * Avatar Utilities for Chat Center
 * Generates deterministic initials and colors for lead avatars
 */

/**
 * Extracts initials from a full name or falls back to "WA"
 * @param fullName - Full name of the lead
 * @param waId - WhatsApp ID (fallback identifier)
 * @returns 2-character uppercase initials
 */
export function getInitials(fullName?: string, waId?: string): string {
    if (!fullName || fullName.trim() === '') {
        return 'WA'
    }

    const trimmed = fullName.trim()
    const parts = trimmed.split(/\s+/)

    if (parts.length >= 2) {
        // First letter of first name + first letter of first surname
        return (parts[0][0] + parts[1][0]).toUpperCase()
    } else if (parts.length === 1 && parts[0].length >= 2) {
        // First and last letter of single name
        const name = parts[0]
        return (name[0] + name[name.length - 1]).toUpperCase()
    } else if (parts.length === 1 && parts[0].length === 1) {
        // Repeat single letter
        return (parts[0][0] + parts[0][0]).toUpperCase()
    }

    return 'WA'
}

/**
 * Generates a deterministic pastel color based on a seed string
 * @param seed - Seed string (typically wa_id)
 * @returns Hex color code (pastel, light background)
 */
export function getAvatarColor(seed: string): string {
    // Simple hash function
    let hash = 0
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash)
        hash = hash & hash // Convert to 32-bit integer
    }

    // Generate pastel colors (high lightness, medium saturation)
    const hue = Math.abs(hash % 360)
    const saturation = 45 + (Math.abs(hash) % 20) // 45-65%
    const lightness = 80 + (Math.abs(hash >> 8) % 10) // 80-90% (very light)

    return hslToHex(hue, saturation, lightness)
}

/**
 * Converts HSL to Hex color
 */
function hslToHex(h: number, s: number, l: number): string {
    l /= 100
    const a = (s * Math.min(l, 1 - l)) / 100
    const f = (n: number) => {
        const k = (n + h / 30) % 12
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
        return Math.round(255 * color)
            .toString(16)
            .padStart(2, '0')
    }
    return `#${f(0)}${f(8)}${f(4)}`
}
