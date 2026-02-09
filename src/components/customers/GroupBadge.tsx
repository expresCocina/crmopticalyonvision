'use client'

import { X } from 'lucide-react'

interface GroupBadgeProps {
    name: string
    color: string
    onRemove?: () => void
    className?: string
}

export function GroupBadge({ name, color, onRemove, className = '' }: GroupBadgeProps) {
    return (
        <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white ${className}`}
            style={{ backgroundColor: color }}
        >
            {name}
            {onRemove && (
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onRemove()
                    }}
                    className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                >
                    <X className="h-3 w-3" />
                </button>
            )}
        </span>
    )
}
