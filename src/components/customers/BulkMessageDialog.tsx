'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { messageTemplates, type TemplateKey, fillTemplate } from '@/lib/message-templates'
import { Send } from 'lucide-react'

interface BulkMessageDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    selectedCount: number
    onSend: (message: string) => Promise<boolean>
}

export function BulkMessageDialog({ open, onOpenChange, selectedCount, onSend }: BulkMessageDialogProps) {
    const [message, setMessage] = useState('')
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey | ''>('')
    const [sending, setSending] = useState(false)

    const handleTemplateSelect = (templateKey: string) => {
        if (!templateKey) {
            setSelectedTemplate('')
            return
        }

        setSelectedTemplate(templateKey as TemplateKey)
        // Fill template with placeholder values
        const template = messageTemplates[templateKey as TemplateKey]
        setMessage(template.template)
    }

    const handleSend = async () => {
        if (!message.trim()) return

        setSending(true)
        const success = await onSend(message)
        setSending(false)

        if (success) {
            setMessage('')
            setSelectedTemplate('')
            onOpenChange(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Enviar Mensaje Masivo</DialogTitle>
                    <DialogDescription>
                        Enviarás este mensaje a {selectedCount} cliente(s) seleccionado(s) por WhatsApp.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Template Selector */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            Plantilla (opcional)
                        </label>
                        <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar plantilla..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">Sin plantilla</SelectItem>
                                {Object.entries(messageTemplates).map(([key, template]) => (
                                    <SelectItem key={key} value={key}>
                                        {template.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Message Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            Mensaje
                        </label>
                        <Textarea
                            placeholder="Escribe tu mensaje aquí..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={6}
                            className="resize-none"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>
                                {selectedTemplate && (
                                    <>Variables: {messageTemplates[selectedTemplate].variables.join(', ')}</>
                                )}
                            </span>
                            <span>{message.length} caracteres</span>
                        </div>
                    </div>

                    {/* Preview */}
                    {message && (
                        <div className="rounded-lg bg-muted p-3 space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">Vista previa:</div>
                            <div className="text-sm whitespace-pre-wrap">{message}</div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={sending}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSend}
                        disabled={!message.trim() || sending}
                    >
                        {sending ? (
                            <>Enviando...</>
                        ) : (
                            <>
                                <Send className="h-4 w-4 mr-2" />
                                Enviar a {selectedCount}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
