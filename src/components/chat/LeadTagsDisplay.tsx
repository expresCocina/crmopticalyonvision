import React from 'react'
import { useLeadTags, PREDEFINED_TAGS } from '@/hooks/useLeadTags'

interface LeadTagsDisplayProps {
    leadId: string
}

export default function LeadTagsDisplay({ leadId }: LeadTagsDisplayProps) {
    const { tags } = useLeadTags(leadId)

    if (tags.length === 0) return null

    return (
        <div className="flex gap-1 mt-1 flex-wrap">
            {tags.slice(0, 2).map(tag => {
                const predefinedTag = PREDEFINED_TAGS.find(pt => pt.value === tag.tag)
                const colorClass = {
                    blue: 'bg-blue-100 text-blue-700',
                    green: 'bg-green-100 text-green-700',
                    yellow: 'bg-yellow-100 text-yellow-700',
                    orange: 'bg-orange-100 text-orange-700',
                    purple: 'bg-purple-100 text-purple-700',
                    emerald: 'bg-emerald-100 text-emerald-700',
                    red: 'bg-red-100 text-red-700',
                    pink: 'bg-pink-100 text-pink-700',
                    indigo: 'bg-indigo-100 text-indigo-700',
                }[tag.color] || 'bg-gray-100 text-gray-700'

                return (
                    <span
                        key={tag.id}
                        className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${colorClass}`}
                    >
                        {predefinedTag?.label || tag.tag}
                    </span>
                )
            })}
            {tags.length > 2 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">
                    +{tags.length - 2}
                </span>
            )}
        </div>
    )
}
