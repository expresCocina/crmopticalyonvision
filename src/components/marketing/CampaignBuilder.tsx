'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Send, Users } from 'lucide-react'
import { useTemplates } from '@/hooks/useTemplates'
import { useCampaigns } from '@/hooks/useCampaigns'
import { createClient } from '@/lib/supabase/client'

interface Lead {
    id: string
    wa_id: string
    full_name: string | null
    status: string
}

export function CampaignBuilder() {
    const { templates } = useTemplates()
    const { createCampaign, sendCampaign } = useCampaigns()
    const [customers, setCustomers] = useState<Lead[]>([])


    const [campaignName, setCampaignName] = useState('')
    const [selectedTemplate, setSelectedTemplate] = useState<string>('none')
    const [message, setMessage] = useState('')
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
    const [sending, setSending] = useState(false)

    const statuses = [
        { value: 'nuevo', label: 'Nuevo' },
        { value: 'interesado', label: 'Interesado' },
        { value: 'cotizado', label: 'Cotizado' },
        { value: 'agendado', label: 'Agendado' },
        { value: 'no_responde', label: 'No Responde' },
        { value: 'cliente', label: 'Cliente' },
        { value: 'recurrente', label: 'Recurrente' }
    ]

    // Fetch customers
    useEffect(() => {
        const fetchCustomers = async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from('leads')
                .select('id, wa_id, full_name, status')
                .order('last_interaction', { ascending: false })

            if (data) {
                setCustomers(data)
            }
        }
        fetchCustomers()
    }, [])

    const handleTemplateSelect = (templateId: string) => {
        setSelectedTemplate(templateId)
        if (templateId !== 'none') {
            const template = templates.find(t => t.id === templateId)
            if (template) {
                setMessage(template.content)
            }
        } else {
            setMessage('')
        }
    }

    const toggleStatus = (status: string) => {
        setSelectedStatuses(prev =>
            prev.includes(status)
                ? prev.filter(s => s !== status)
                : [...prev, status]
        )
    }

    const filteredCustomers = useMemo(() => {
        if (selectedStatuses.length === 0) return customers
        return customers.filter(c => selectedStatuses.includes(c.status))
    }, [customers, selectedStatuses])


    const handleSend = async () => {
        if (!campaignName.trim() || !message.trim() || filteredCustomers.length === 0) return

        setSending(true)

        // Create campaign
        const { success, data: campaign } = await createCampaign({
            name: campaignName,
            message_template: message,
            target_status: selectedStatuses.length > 0 ? selectedStatuses : null
        })

        if (success && campaign) {
            // Send to filtered customers
            const leadIds = filteredCustomers.map(c => c.id)
            await sendCampaign(campaign.id, leadIds, message)

            // Reset form
            setCampaignName('')
            setSelectedTemplate('none')
            setMessage('')
            setSelectedStatuses([])
        }

        setSending(false)
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Nueva Campaña</h2>
                <p className="text-sm text-muted-foreground">
                    Crea y envía campañas de marketing a tus clientes
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Left Column - Campaign Details */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Detalles de la Campaña</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="campaign-name">Nombre de la Campaña</Label>
                                <Input
                                    id="campaign-name"
                                    placeholder="Ej: Promoción Verano 2024"
                                    value={campaignName}
                                    onChange={(e) => setCampaignName(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="template">Plantilla (opcional)</Label>
                                <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                                    <SelectTrigger id="template">
                                        <SelectValue placeholder="Seleccionar plantilla..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Sin plantilla</SelectItem>
                                        {templates.map((template) => (
                                            <SelectItem key={template.id} value={template.id}>
                                                {template.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="message">Mensaje</Label>
                                <Textarea
                                    id="message"
                                    placeholder="Escribe tu mensaje aquí..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={8}
                                    className="resize-none"
                                />
                                <p className="text-xs text-muted-foreground">
                                    {message.length} caracteres
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Segmentación de Audiencia</CardTitle>
                            <CardDescription>
                                Selecciona los estados de clientes a los que quieres enviar
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {statuses.map((status) => (
                                    <div key={status.value} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={status.value}
                                            checked={selectedStatuses.includes(status.value)}
                                            onCheckedChange={() => toggleStatus(status.value)}
                                        />
                                        <label
                                            htmlFor={status.value}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                        >
                                            {status.label}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Preview & Stats */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Audiencia
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                                    <span className="text-sm font-medium">Destinatarios</span>
                                    <Badge variant="secondary" className="text-lg px-3 py-1">
                                        {filteredCustomers.length}
                                    </Badge>
                                </div>

                                {selectedStatuses.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">Filtros aplicados:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedStatuses.map((status) => (
                                                <Badge key={status} variant="outline">
                                                    {statuses.find(s => s.value === status)?.label}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {message && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Vista Previa</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-lg bg-muted p-4">
                                    <div className="text-sm whitespace-pre-wrap">{message}</div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Button
                        className="w-full"
                        size="lg"
                        onClick={handleSend}
                        disabled={!campaignName.trim() || !message.trim() || filteredCustomers.length === 0 || sending}
                    >
                        {sending ? (
                            'Enviando...'
                        ) : (
                            <>
                                <Send className="h-4 w-4 mr-2" />
                                Enviar a {filteredCustomers.length} cliente{filteredCustomers.length !== 1 ? 's' : ''}
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
