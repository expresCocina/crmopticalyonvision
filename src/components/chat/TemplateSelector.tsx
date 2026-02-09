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
import { FileText } from 'lucide-react'
import { useMessageTemplates } from '@/hooks/useMessageTemplates'

interface TemplateSelectorProps {
    onSelect: (content: string) => void
    disabled?: boolean
}

export function TemplateSelector({ onSelect, disabled }: TemplateSelectorProps) {
    const { templates, loading } = useMessageTemplates()
    const [selectedId, setSelectedId] = useState<string>('')

    const handleSelect = (templateId: string) => {
        setSelectedId(templateId)
        const template = templates.find(t => t.id === templateId)
        if (template) {
            onSelect(template.content)
        }
    }

    if (loading || templates.length === 0) {
        return null
    }

    return (
        <Select value={selectedId} onValueChange={handleSelect} disabled={disabled}>
            <SelectTrigger className="w-auto gap-2 border-none bg-transparent hover:bg-accent">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Plantillas</span>
            </SelectTrigger>
            <SelectContent>
                {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                        <div className="flex flex-col items-start">
                            <span className="font-medium">{template.name}</span>
                            {template.category && (
                                <span className="text-xs text-muted-foreground">
                                    {template.category}
                                </span>
                            )}
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
