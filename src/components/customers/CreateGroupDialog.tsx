'use client'

import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type CustomerGroup } from '@/hooks/useCustomerGroups'

interface CreateGroupDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: (name: string, description: string, color: string) => Promise<boolean>
    editingGroup?: CustomerGroup | null
}

const PRESET_COLORS = [
    { name: 'Azul', value: '#3b82f6' },
    { name: 'Verde', value: '#10b981' },
    { name: 'Amarillo', value: '#f59e0b' },
    { name: 'Rojo', value: '#ef4444' },
    { name: 'Morado', value: '#8b5cf6' },
    { name: 'Rosa', value: '#ec4899' },
    { name: 'Índigo', value: '#6366f1' },
    { name: 'Gris', value: '#6b7280' },
]

export function CreateGroupDialog({
    open,
    onOpenChange,
    onSave,
    editingGroup
}: CreateGroupDialogProps) {
    const [name, setName] = useState(editingGroup?.name || '')
    const [description, setDescription] = useState(editingGroup?.description || '')
    const [selectedColor, setSelectedColor] = useState(editingGroup?.color || PRESET_COLORS[0].value)
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        if (!name.trim()) return

        setSaving(true)
        const success = await onSave(name.trim(), description.trim(), selectedColor)
        setSaving(false)

        if (success) {
            handleClose()
        }
    }

    const handleClose = () => {
        setName('')
        setDescription('')
        setSelectedColor(PRESET_COLORS[0].value)
        onOpenChange(false)
    }

    // Actualizar estado cuando cambia el grupo en edición
    if (editingGroup && name !== editingGroup.name) {
        setName(editingGroup.name)
        setDescription(editingGroup.description || '')
        setSelectedColor(editingGroup.color)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {editingGroup ? 'Editar Grupo' : 'Crear Nuevo Grupo'}
                    </DialogTitle>
                    <DialogDescription>
                        {editingGroup
                            ? 'Modifica los detalles del grupo'
                            : 'Crea un grupo para organizar tus clientes'
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Nombre */}
                    <div className="space-y-2">
                        <Label htmlFor="group-name">Nombre del Grupo *</Label>
                        <Input
                            id="group-name"
                            placeholder="Ej: Universidad Asturias"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={50}
                        />
                    </div>

                    {/* Descripción */}
                    <div className="space-y-2">
                        <Label htmlFor="group-description">Descripción (opcional)</Label>
                        <Input
                            id="group-description"
                            placeholder="Ej: Clientes de la Universidad Asturias"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            maxLength={200}
                        />
                    </div>

                    {/* Selector de Color */}
                    <div className="space-y-2">
                        <Label>Color</Label>
                        <div className="grid grid-cols-4 gap-2">
                            {PRESET_COLORS.map((color) => (
                                <button
                                    key={color.value}
                                    onClick={() => setSelectedColor(color.value)}
                                    className={`h-10 rounded-md border-2 transition-all ${selectedColor === color.value
                                            ? 'border-foreground scale-110'
                                            : 'border-transparent hover:scale-105'
                                        }`}
                                    style={{ backgroundColor: color.value }}
                                    title={color.name}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground mb-2">Vista previa:</p>
                        <span
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                            style={{ backgroundColor: selectedColor }}
                        >
                            {name || 'Nombre del grupo'}
                        </span>
                    </div>

                    {/* Botones */}
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={handleClose} disabled={saving}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={!name.trim() || saving}>
                            {saving ? 'Guardando...' : editingGroup ? 'Actualizar' : 'Crear Grupo'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
