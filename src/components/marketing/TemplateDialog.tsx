'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import type { MessageTemplate } from '@/hooks/useTemplates'

interface TemplateDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    template?: MessageTemplate | null
    onSave: (template: Partial<MessageTemplate>) => Promise<{ success: boolean }>
}

export function TemplateDialog({ open, onOpenChange, template, onSave }: TemplateDialogProps) {
    const [name, setName] = useState(template?.name || '')
    const [category, setCategory] = useState(template?.category || 'general')
    const [content, setContent] = useState(template?.content || '')
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        if (!name.trim() || !content.trim()) return

        setSaving(true)

        // Extract variables from content
        const variableRegex = /\{(\w+)\}/g
        const variables: string[] = []
        let match
        while ((match = variableRegex.exec(content)) !== null) {
            if (!variables.includes(match[1])) {
                variables.push(match[1])
            }
        }

        const result = await onSave({
            name,
            category,
            content,
            variables
        })

        setSaving(false)

        if (result.success) {
            setName('')
            setCategory('general')
            setContent('')
            onOpenChange(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{template ? 'Editar Plantilla' : 'Nueva Plantilla'}</DialogTitle>
                    <DialogDescription>
                        Crea plantillas reutilizables para tus campañas. Usa variables como {'{nombre}'} o {'{empresa}'}.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre de la Plantilla</Label>
                        <Input
                            id="name"
                            placeholder="Ej: Promoción Verano 2024"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="category">Categoría</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger id="category">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="general">General</SelectItem>
                                <SelectItem value="promocion">Promoción</SelectItem>
                                <SelectItem value="recordatorio">Recordatorio</SelectItem>
                                <SelectItem value="seguimiento">Seguimiento</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="content">Contenido del Mensaje</Label>
                        <Textarea
                            id="content"
                            placeholder="Hola {nombre}, tenemos una promoción especial para ti..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={6}
                            className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                            Variables disponibles: {'{nombre}'}, {'{empresa}'}, {'{fecha}'}, {'{hora}'}
                        </p>
                    </div>

                    {content && (
                        <div className="rounded-lg bg-muted p-3 space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">Vista previa:</div>
                            <div className="text-sm whitespace-pre-wrap">{content}</div>
                            <div className="text-xs text-muted-foreground">{content.length} caracteres</div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={!name.trim() || !content.trim() || saving}>
                        {saving ? 'Guardando...' : template ? 'Actualizar' : 'Crear Plantilla'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
