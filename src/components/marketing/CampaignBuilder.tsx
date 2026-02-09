'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Send, Users, Image as ImageIcon, X, Calendar, Clock } from 'lucide-react'
import { useTemplates } from '@/hooks/useTemplates'
import { useCampaigns } from '@/hooks/useCampaigns'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { GroupAutoAssigner } from '@/components/marketing/GroupAutoAssigner'

interface Lead {
    id: string
    wa_id: string
    full_name: string | null
    status: string
}

interface CustomerGroup {
    id: string
    name: string
    description: string | null
    customer_count?: number
}

export function CampaignBuilder() {
    const { templates } = useTemplates()
    const { createCampaign, sendCampaign, sendCampaignWithImage, triggerInstantCampaign } = useCampaigns()
    const [customers, setCustomers] = useState<Lead[]>([])
    const [groups, setGroups] = useState<CustomerGroup[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [triggering, setTriggering] = useState<string | null>(null)

    const handleTriggerNow = async (campaignId: string) => {
        setTriggering(campaignId)
        toast.loading('Iniciando envío inmediato...')

        try {
            const { success, error } = await triggerInstantCampaign(campaignId)

            if (success) {
                toast.success('Envío iniciado correctamente')
            } else {
                toast.error('Error al iniciar envío')
                console.error(error)
            }
        } catch (err) {
            console.error(err)
            toast.error('Error inesperado')
        } finally {
            setTriggering(null)
            toast.dismiss()
        }
    }
    const [campaignName, setCampaignName] = useState('')
    const [selectedTemplate, setSelectedTemplate] = useState<string>('none')
    const [message, setMessage] = useState('')
    const [sending, setSending] = useState(false)

    // Campaign State
    const [campaignMode, setCampaignMode] = useState<'legacy' | 'mass'>('mass')

    // Legacy Mode State (Filter by Status)
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])

    // Mass Mode State (Groups + Image + Interval)
    const [selectedGroups, setSelectedGroups] = useState<string[]>([])
    const [sendInterval, setSendInterval] = useState<number>(3)
    const [mediaFile, setMediaFile] = useState<File | null>(null)
    const [mediaPreview, setMediaPreview] = useState<string | null>(null)

    const statuses = [
        { value: 'nuevo', label: 'Nuevo' },
        { value: 'interesado', label: 'Interesado' },
        { value: 'cotizado', label: 'Cotizado' },
        { value: 'agendado', label: 'Agendado' },
        { value: 'no_responde', label: 'No Responde' },
        { value: 'cliente', label: 'Cliente' },
        { value: 'recurrente', label: 'Recurrente' }
    ]

    // Fetch customers and groups
    useEffect(() => {
        const fetchData = async () => {
            const supabase = createClient()
            // Fetch customers
            const { data: leadsData } = await supabase
                .from('leads')
                .select('id, wa_id, full_name, status')
                .order('last_interaction', { ascending: false })

            if (leadsData) setCustomers(leadsData)

            // Fetch groups with count
            fetchGroups()
        }
        fetchData()
    }, [])

    const fetchGroups = async () => {
        const supabase = createClient()
        // Fetch groups
        const { data: groupsData } = await supabase
            .from('customer_groups')
            .select('*')
            .order('created_at', { ascending: true })

        if (groupsData) {
            // Get counts
            const groupsWithCounts = await Promise.all(groupsData.map(async (group) => {
                const { count } = await supabase
                    .from('lead_groups')
                    .select('*', { count: 'exact', head: true })
                    .eq('group_id', group.id)
                return { ...group, customer_count: count || 0 }
            }))
            setGroups(groupsWithCounts)
        }
    }

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

    const toggleGroup = (groupId: string) => {
        setSelectedGroups(prev =>
            prev.includes(groupId)
                ? prev.filter(g => g !== groupId)
                : [...prev, groupId]
        )
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            toast.error('Solo se permiten imágenes')
            return
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('La imagen no debe superar 5MB')
            return
        }

        setMediaFile(file)

        const reader = new FileReader()
        reader.onloadend = () => {
            setMediaPreview(reader.result as string)
        }
        reader.readAsDataURL(file)
    }

    const removeImage = () => {
        setMediaFile(null)
        setMediaPreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const filteredCustomers = useMemo(() => {
        if (campaignMode === 'mass') {
            // Calculate total customers in selected groups
            const total = groups
                .filter(g => selectedGroups.includes(g.id))
                .reduce((acc, curr) => acc + (curr.customer_count || 0), 0)
            // Return dummy array with length for display
            return Array(total).fill({})
        } else {
            if (selectedStatuses.length === 0) return customers
            return customers.filter(c => selectedStatuses.includes(c.status))
        }
    }, [campaignMode, customers, selectedStatuses, groups, selectedGroups])

    const handleSend = async (forceImmediate: boolean = false) => {
        if (!campaignName.trim() || !message.trim()) {
            toast.error('Completa los campos obligatorios')
            return
        }

        if (campaignMode === 'legacy' && filteredCustomers.length === 0) {
            toast.error('Selecciona al menos un estado')
            return
        }

        if (campaignMode === 'mass' && selectedGroups.length === 0) {
            toast.error('Selecciona al menos un grupo')
            return
        }

        setSending(true)
        if (forceImmediate) {
            toast.loading('Iniciando campaña y enviando primer grupo...')
        } else {
            toast.loading(campaignMode === 'mass' ? 'Programando campaña...' : 'Enviando campaña...')
        }

        try {
            const supabase = createClient()
            let mediaUrl = null

            // Upload image if exists
            if (mediaFile) {
                const fileExt = mediaFile.name.split('.').pop()
                const fileName = `campaigns/${Date.now()}.${fileExt}`

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('chat-media')
                    .upload(fileName, mediaFile, {
                        cacheControl: '3600',
                        upsert: false
                    })

                if (uploadError) throw uploadError

                const { data: signedData } = await supabase.storage
                    .from('chat-media')
                    .createSignedUrl(uploadData.path, 31536000) // 1 año

                if (signedData) mediaUrl = signedData.signedUrl
            }

            // Create campaign
            const campaignData: any = {
                name: campaignName,
                message_template: message,
                campaign_type: mediaUrl ? 'image' : 'text',
                media_url: mediaUrl,
                is_active: true
            }

            if (campaignMode === 'mass') {
                campaignData.target_groups = selectedGroups
                campaignData.send_interval_days = sendInterval
                campaignData.current_group_index = 0
            } else {
                campaignData.target_status = selectedStatuses
            }

            const { success, data: campaign } = await createCampaign(campaignData)

            if (success && campaign) {
                if (campaignMode === 'legacy') {
                    // Send immediately
                    const leadIds = filteredCustomers.map(c => c.id)
                    if (mediaUrl) {
                        await sendCampaignWithImage(campaign.id, leadIds, message, mediaUrl)
                    } else {
                        await sendCampaign(campaign.id, leadIds, message)
                    }
                    toast.success(`Enviado a ${leadIds.length} clientes`)
                } else {
                    // Mass Campaign
                    if (forceImmediate) {
                        // Trigger immediate send for first group
                        await triggerInstantCampaign(campaign.id)
                        toast.success('Campaña creada y envío iniciado inmediatamente')
                    } else {
                        // Scheduled campaign
                        toast.success('Campaña programada exitosamente')
                    }
                }

                // Reset form
                setCampaignName('')
                setSelectedTemplate('none')
                setMessage('')
                setSelectedStatuses([])
                setSelectedGroups([])
                removeImage()
            } else {
                toast.error('Error al crear la campaña')
            }
        } catch (error) {
            console.error('Error:', error)
            toast.error('Error al procesar la campaña')
        } finally {
            setSending(false)
            toast.dismiss()
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Nueva Campaña</h2>
                    <p className="text-sm text-muted-foreground">
                        Crea y envía campañas de marketing a tus clientes
                    </p>
                </div>
                <div className="flex gap-2">
                    <GroupAutoAssigner onComplete={fetchGroups} />
                </div>
            </div>

            <Tabs value={campaignMode} onValueChange={(v) => setCampaignMode(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="mass">Campañas Programadas (Grupos)</TabsTrigger>
                    <TabsTrigger value="legacy">Envío Inmediato (Estados)</TabsTrigger>
                </TabsList>

                <div className="grid gap-6 lg:grid-cols-2 mt-6">
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
                                        placeholder="Ej: Promoción Febrero"
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
                                        placeholder="Hola {nombre}, tenemos una oferta..."
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        rows={6}
                                        className="resize-none"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Variables: {'{nombre}'}
                                    </p>
                                </div>

                                {/* Image Upload */}
                                <div className="space-y-2">
                                    <Label>Imagen (Opcional)</Label>
                                    <div className="flex gap-4 items-start">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <ImageIcon className="h-4 w-4 mr-2" />
                                            Subir Imagen
                                        </Button>
                                        {mediaPreview && (
                                            <div className="relative w-20 h-20 border rounded-md overflow-hidden">
                                                <img src={mediaPreview} alt="Preview" className="w-full h-full object-cover" />
                                                <button
                                                    onClick={removeImage}
                                                    className="absolute top-0 right-0 bg-black/50 text-white p-0.5"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Segmentación</CardTitle>
                                <CardDescription>
                                    {campaignMode === 'mass'
                                        ? 'Selecciona los grupos para envío programado'
                                        : 'Selecciona los estados para envío inmediato'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <TabsContent value="mass" className="mt-0 space-y-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <Label>Enviar cada:</Label>
                                        <Input
                                            type="number"
                                            value={sendInterval}
                                            onChange={(e) => setSendInterval(Number(e.target.value))}
                                            className="w-20"
                                            min={1}
                                        />
                                        <span className="text-sm text-muted-foreground">días por grupo</span>
                                    </div>

                                    <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                                        {groups.length === 0 ? (
                                            <div className="text-center py-4 text-muted-foreground">
                                                No hay grupos. Usa "Auto-asignar" para crear grupos.
                                            </div>
                                        ) : (
                                            groups.map((group) => (
                                                <div key={group.id} className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50">
                                                    <Checkbox
                                                        id={group.id}
                                                        checked={selectedGroups.includes(group.id)}
                                                        onCheckedChange={() => toggleGroup(group.id)}
                                                    />
                                                    <label htmlFor={group.id} className="flex-1 cursor-pointer">
                                                        <div className="font-medium">{group.name}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {group.customer_count || 0} clientes
                                                        </div>
                                                    </label>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent value="legacy" className="mt-0">
                                    <div className="space-y-3">
                                        {statuses.map((status) => (
                                            <div key={status.value} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={status.value}
                                                    checked={selectedStatuses.includes(status.value)}
                                                    onCheckedChange={() => toggleStatus(status.value)}
                                                />
                                                <label htmlFor={status.value} className="cursor-pointer text-sm font-medium">
                                                    {status.label}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </TabsContent>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - Preview & Stats */}
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    Resumen
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                                        <span className="text-sm font-medium">Destinatarios Totales</span>
                                        <Badge variant="secondary" className="text-lg px-3 py-1">
                                            {filteredCustomers.length}
                                        </Badge>
                                    </div>

                                    {campaignMode === 'mass' && selectedGroups.length > 0 && (
                                        <div className="text-sm space-y-2 border-t pt-4">
                                            <div className="flex justify-between">
                                                <span>Grupos seleccionados:</span>
                                                <span className="font-medium">{selectedGroups.length}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Duración estimada:</span>
                                                <span className="font-medium">{(selectedGroups.length - 1) * sendInterval} días</span>
                                            </div>
                                            <div className="text-muted-foreground text-xs mt-2">
                                                * El primer grupo se enviará mañana a las 9:00 AM
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
                                    <div className="rounded-lg bg-muted p-4 space-y-2">
                                        {mediaPreview && (
                                            <img src={mediaPreview} alt="Preview" className="w-full rounded-lg mb-2" />
                                        )}
                                        <div className="text-sm whitespace-pre-wrap">{message}</div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <div className="flex flex-col gap-3">
                            <Button
                                className="w-full"
                                size="lg"
                                onClick={() => handleSend(false)}
                                disabled={
                                    !campaignName.trim() ||
                                    !message.trim() ||
                                    (campaignMode === 'legacy' && filteredCustomers.length === 0) ||
                                    (campaignMode === 'mass' && selectedGroups.length === 0) ||
                                    sending
                                }
                            >
                                {sending ? (
                                    'Procesando...'
                                ) : (
                                    <>
                                        <Send className="h-4 w-4 mr-2" />
                                        {campaignMode === 'mass' ? 'Programar Campaña' : 'Enviar Ahora'}
                                    </>
                                )}
                            </Button>

                            {campaignMode === 'mass' && (
                                <Button
                                    className="w-full"
                                    variant="secondary"
                                    size="lg"
                                    onClick={() => handleSend(true)}
                                    disabled={
                                        !campaignName.trim() ||
                                        !message.trim() ||
                                        selectedGroups.length === 0 ||
                                        sending
                                    }
                                >
                                    <Send className="h-4 w-4 mr-2" />
                                    Enviar Ahora (Crear y Enviar 1er Grupo)
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </Tabs>
        </div>
    )
}
