import React from 'react'
import { X } from 'lucide-react'

interface LeadTagProps {
    tag: string
    color: string
    onRemove?: () => void
    size?: 'sm' | 'md'
}

const colorClasses = {
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    pink: 'bg-pink-100 text-pink-800 border-pink-200',
    indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
}

export default function LeadTag({ tag, color, onRemove, size = 'md' }: LeadTagProps) {
    const colorClass = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue
    const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full border font-medium ${colorClass} ${sizeClasses}`}
        >
            {tag}
            {onRemove && (
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onRemove()
                    }}
                    className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
                >
                    <X className="w-3 h-3" />
                </button>
            )}
        </span>
    )
}
