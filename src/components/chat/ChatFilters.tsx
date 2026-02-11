'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Filter, X } from 'lucide-react'
import { PREDEFINED_TAGS } from '@/hooks/useLeadTags'

interface ChatFiltersProps {
    onFilterChange: (filters: ChatFilterState) => void
}

export interface ChatFilterState {
    showUnreadOnly: boolean
    selectedTags: string[]
}

export function ChatFilters({ onFilterChange }: ChatFiltersProps) {
    const [showUnreadOnly, setShowUnreadOnly] = useState(false)
    const [selectedTags, setSelectedTags] = useState<string[]>([])

    const handleUnreadToggle = () => {
        const newValue = !showUnreadOnly
        setShowUnreadOnly(newValue)
        onFilterChange({ showUnreadOnly: newValue, selectedTags })
    }

    const handleTagSelect = (tagValue: string) => {
        const newTags = selectedTags.includes(tagValue)
            ? selectedTags.filter(t => t !== tagValue)
            : [...selectedTags, tagValue]

        setSelectedTags(newTags)
        onFilterChange({ showUnreadOnly, selectedTags: newTags })
    }

    const clearFilters = () => {
        setShowUnreadOnly(false)
        setSelectedTags([])
        onFilterChange({ showUnreadOnly: false, selectedTags: [] })
    }

    const hasActiveFilters = showUnreadOnly || selectedTags.length > 0

    return (
        <div className="flex items-center gap-2 p-2 border-b bg-background">
            <Filter className="h-4 w-4 text-muted-foreground" />

            {/* Toggle No Leídos */}
            <Button
                variant={showUnreadOnly ? "default" : "outline"}
                size="sm"
                onClick={handleUnreadToggle}
                className="text-xs"
            >
                {showUnreadOnly ? '✓ ' : ''}No leídos
            </Button>

            {/* Filtro por Tags */}
            <Select value="" onValueChange={handleTagSelect}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="Filtrar por tag" />
                </SelectTrigger>
                <SelectContent>
                    {PREDEFINED_TAGS.map((tag) => (
                        <SelectItem key={tag.value} value={tag.value} className="text-xs">
                            <div className="flex items-center gap-2">
                                {selectedTags.includes(tag.value) && '✓ '}
                                {tag.label}
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Tags seleccionados */}
            {selectedTags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                    {selectedTags.map(tagValue => {
                        const tag = PREDEFINED_TAGS.find(t => t.value === tagValue)
                        return (
                            <span
                                key={tagValue}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary"
                            >
                                {tag?.label}
                                <X
                                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                                    onClick={() => handleTagSelect(tagValue)}
                                />
                            </span>
                        )
                    })}
                </div>
            )}

            {/* Limpiar filtros */}
            {hasActiveFilters && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="ml-auto text-xs"
                >
                    Limpiar
                </Button>
            )}
        </div>
    )
}
