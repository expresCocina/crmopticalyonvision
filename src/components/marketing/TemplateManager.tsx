'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Copy } from 'lucide-react'
import { useTemplates } from '@/hooks/useTemplates'
import { TemplateDialog } from './TemplateDialog'
import type { MessageTemplate } from '@/hooks/useTemplates'

export function TemplateManager() {
    const { templates, loading, createTemplate, updateTemplate, deleteTemplate } = useTemplates()
    const [showDialog, setShowDialog] = useState(false)
    const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null)

    const handleCreate = () => {
        setSelectedTemplate(null)
        setShowDialog(true)
    }

    const handleEdit = (template: MessageTemplate) => {
        setSelectedTemplate(template)
        setShowDialog(true)
    }

    const handleSave = async (template: Partial<MessageTemplate>) => {
        if (selectedTemplate) {
            return await updateTemplate(selectedTemplate.id, template)
        } else {
            return await createTemplate(template)
        }
    }

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de eliminar esta plantilla?')) {
            await deleteTemplate(id)
        }
    }

    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            general: 'bg-gray-100 text-gray-700',
            promocion: 'bg-green-100 text-green-700',
            recordatorio: 'bg-blue-100 text-blue-700',
            seguimiento: 'bg-purple-100 text-purple-700'
        }
        return colors[category] || colors.general
    }

    const getCategoryLabel = (category: string) => {
        const labels: Record<string, string> = {
            general: 'General',
            promocion: 'Promoción',
            recordatorio: 'Recordatorio',
            seguimiento: 'Seguimiento'
        }
        return labels[category] || category
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Plantillas de Mensajes</h2>
                    <p className="text-sm text-muted-foreground">
                        Crea y gestiona plantillas reutilizables para tus campañas
                    </p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Plantilla
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-8 text-muted-foreground">Cargando plantillas...</div>
            ) : templates.length === 0 ? (
                <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                        No hay plantillas creadas. Crea tu primera plantilla para comenzar.
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {templates.map((template) => (
                        <Card key={template.id} className="hover:shadow-md transition-shadow">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1 flex-1">
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-lg">{template.name}</CardTitle>
                                            {template.is_official && (
                                                <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-[10px]">
                                                    Oficial
                                                </Badge>
                                            )}
                                        </div>
                                        <Badge className={getCategoryColor(template.category)}>
                                            {getCategoryLabel(template.category)}
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="text-sm text-muted-foreground line-clamp-3">
                                    {template.content}
                                </div>

                                {template.variables && template.variables.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {template.variables.map((variable) => (
                                            <Badge key={variable} variant="outline" className="text-xs">
                                                {'{' + variable + '}'}
                                            </Badge>
                                        ))}
                                    </div>
                                )}

                                <div className="flex gap-2 pt-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => handleEdit(template)}
                                    >
                                        <Edit className="h-3 w-3 mr-1" />
                                        Editar
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            navigator.clipboard.writeText(template.content)
                                        }}
                                    >
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleDelete(template.id)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <TemplateDialog
                open={showDialog}
                onOpenChange={setShowDialog}
                template={selectedTemplate}
                onSave={handleSave}
            />
        </div>
    )
}
