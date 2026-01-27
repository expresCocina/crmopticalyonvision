import { getInitials, getAvatarColor } from '@/lib/utils/avatar'
import { MessageCircle } from 'lucide-react'

interface LeadAvatarProps {
    fullName?: string
    waId: string
    active?: boolean
    size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
}

const badgeSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
}

export function LeadAvatar({ fullName, waId, active = false, size = 'md' }: LeadAvatarProps) {
    const initials = getInitials(fullName, waId)
    const bgColor = getAvatarColor(waId)
    const borderColor = active ? '#FFD700' : '#E5E7EB'

    return (
        <div className="relative inline-block">
            {/* Main Avatar Circle */}
            <div
                className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold transition-all`}
                style={{
                    backgroundColor: bgColor,
                    border: `2px solid ${borderColor}`,
                    color: '#000000'
                }}
            >
                {initials}
            </div>

            {/* WhatsApp Badge */}
            <div
                className={`absolute -bottom-0.5 -right-0.5 ${badgeSizeClasses[size]} bg-white rounded-full flex items-center justify-center shadow-sm`}
                style={{ border: '1px solid #E5E7EB' }}
            >
                <MessageCircle
                    className="w-full h-full p-0.5"
                    style={{ color: '#25D366' }}
                    strokeWidth={2.5}
                />
            </div>
        </div>
    )
}
