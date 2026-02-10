import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { useLeadTags, PREDEFINED_TAGS } from '@/hooks/useLeadTags'
import LeadTag from './LeadTag'

interface LeadTagManagerProps {
    leadId: string
    compact?: boolean
}

export default function LeadTagManager({ leadId, compact = false }: LeadTagManagerProps) {
    const { tags, addTag, removeTag } = useLeadTags(leadId)
    const [showDropdown, setShowDropdown] = useState(false)

    const handleAddTag = (tagValue: string, color: string) => {
        addTag(tagValue, color)
        setShowDropdown(false)
    }

    // Get tags that are not already added
    const availableTags = PREDEFINED_TAGS.filter(
        predefinedTag => !tags.some(t => t.tag === predefinedTag.value)
    )

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {/* Display existing tags */}
            {tags.map(tag => (
                <LeadTag
                    key={tag.id}
                    tag={PREDEFINED_TAGS.find(pt => pt.value === tag.tag)?.label || tag.tag}
                    color={tag.color}
                    onRemove={() => removeTag(tag.id)}
                    size={compact ? 'sm' : 'md'}
                />
            ))}

            {/* Add tag button */}
            {availableTags.length > 0 && (
                <div className="relative">
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className={`inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors ${compact ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'
                            }`}
                    >
                        <Plus className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
                        {!compact && 'Tag'}
                    </button>

                    {/* Dropdown */}
                    {showDropdown && (
                        <>
                            {/* Backdrop */}
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowDropdown(false)}
                            />

                            {/* Dropdown menu */}
                            <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[150px]">
                                {availableTags.map(tag => (
                                    <button
                                        key={tag.value}
                                        onClick={() => handleAddTag(tag.value, tag.color)}
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        <span
                                            className={`w-3 h-3 rounded-full bg-${tag.color}-500`}
                                        />
                                        {tag.label}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
