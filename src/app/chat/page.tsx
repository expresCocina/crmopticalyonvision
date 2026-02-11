'use client'

import { useState, useEffect, useRef } from 'react'
import { useChat } from '@/hooks/useChat'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Send, Search, Phone, MoreVertical, MessageSquare, ArrowLeft, Bot, User, Check, CheckCheck, Archive, X } from 'lucide-react'
import { LeadAvatar } from '@/components/chat/LeadAvatar'
import { AudioRecorder } from '@/components/chat/AudioRecorder'
import { MediaUploadButton } from '@/components/chat/MediaUploadButton'
import { TemplateSelector } from '@/components/chat/TemplateSelector'
import LeadTagManager from '@/components/chat/LeadTagManager'
import { useLeadTags } from '@/hooks/useLeadTags'
import LeadTag from '@/components/chat/LeadTag'
import LeadTagsDisplay from '@/components/chat/LeadTagsDisplay'
import { LastMessagePreview } from '@/components/chat/LastMessagePreview'
import { ChatFilters, ChatFilterState } from '@/components/chat/ChatFilters'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function ChatPage() {
    const {
        leads,
        activeLeadId,
        setActiveLeadId,
        messages,
        loadingLeads,
        loadingMessages,
        sendMessage,
        sendImageMessage,
        sendAudioMessage,
        toggleBot
    } = useChat()

    const [input, setInput] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [searchingMessages, setSearchingMessages] = useState(false)
    const [leadsWithMatchingMessages, setLeadsWithMatchingMessages] = useState<Set<string>>(new Set())
    const [pendingTemplate, setPendingTemplate] = useState<{ name: string, lang: string } | null>(null)
    const [filters, setFilters] = useState<ChatFilterState>({ showUnreadOnly: false, selectedTags: [] })
    const [showArchived, setShowArchived] = useState(false)
    const [selectionMode, setSelectionMode] = useState(false)
    const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Scroll to bottom on new message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const activeLead = leads.find(l => l.id === activeLeadId)

    // Búsqueda en mensajes cuando el término de búsqueda cambia
    useEffect(() => {
        const searchInMessages = async () => {
            if (!searchTerm || searchTerm.length < 2) {
                setLeadsWithMatchingMessages(new Set())
                return
            }

            setSearchingMessages(true)
            const supabase = createClient()

            try {
                const { data, error } = await supabase
                    .from('messages')
                    .select('lead_id')
                    .ilike('content', `%${searchTerm}%`)
                    .limit(100)

                if (!error && data) {
                    const matchingLeadIds = new Set(data.map(m => m.lead_id))
                    setLeadsWithMatchingMessages(matchingLeadIds)
                }
            } catch (err) {
                console.error('Error searching messages:', err)
            } finally {
                setSearchingMessages(false)
            }
        }

        const debounceTimer = setTimeout(searchInMessages, 300)
        return () => clearTimeout(debounceTimer)
    }, [searchTerm])

    // Aplicar filtros
    const filteredLeads = leads.filter(l => {
        // Filtro de archivados (ocultar por defecto)
        if (!showArchived && l.archived) return false
        if (showArchived && !l.archived) return false

        // Filtro de búsqueda (nombre, teléfono O mensajes)
        if (searchTerm) {
            const matchesNameOrPhone = (l.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                l.wa_id.includes(searchTerm)
            const matchesMessages = leadsWithMatchingMessages.has(l.id)

            if (!matchesNameOrPhone && !matchesMessages) return false
        }

        // Filtro de no leídos
        if (filters.showUnreadOnly && l.unread_count === 0) return false

        // Filtro por tags (si hay tags seleccionados, el lead debe tener al menos uno)
        if (filters.selectedTags.length > 0) {
            const leadTags = l.tags || []
            const hasMatchingTag = filters.selectedTags.some(tag => leadTags.includes(tag))
            if (!hasMatchingTag) return false
        }

        return true
    })

    // Función para marcar como leído/no leído
    const markAsRead = async (leadId: string, newCount: number) => {
        const supabase = createClient()
        try {
            const { error } = await supabase
                .from('leads')
                .update({ unread_count: newCount })
                .eq('id', leadId)

            if (error) {
                console.error('Error updating unread count:', error)
                toast.error('Error al actualizar')
            } else {
                toast.success(newCount === 0 ? 'Marcado como leído' : 'Marcado como no leído')
            }
        } catch (err) {
            console.error('Exception updating unread count:', err)
            toast.error('Error inesperado')
        }
    }

    // Función para archivar/desarchivar conversación
    const toggleArchive = async (leadId: string, currentArchived: boolean) => {
        const supabase = createClient()
        try {
            const { error } = await supabase
                .from('leads')
                .update({ archived: !currentArchived })
                .eq('id', leadId)

            if (error) {
                console.error('Error archiving conversation:', error)
                toast.error('Error al archivar')
            } else {
                toast.success(!currentArchived ? 'Conversación archivada' : 'Conversación desarchivada')
            }
        } catch (err) {
            console.error('Exception archiving conversation:', err)
            toast.error('Error inesperado')
        }
    }

    // Funciones de selección múltiple
    const toggleSelection = (leadId: string) => {
        const newSelection = new Set(selectedLeads)
        if (newSelection.has(leadId)) {
            newSelection.delete(leadId)
        } else {
            newSelection.add(leadId)
        }
        setSelectedLeads(newSelection)
    }

    const selectAll = () => {
        const allLeadIds = new Set(filteredLeads.map(l => l.id))
        setSelectedLeads(allLeadIds)
    }

    const clearSelection = () => {
        setSelectedLeads(new Set())
        setSelectionMode(false)
    }

    // Acción en lote: archivar/desarchivar
    const bulkArchive = async (archive: boolean) => {
        const supabase = createClient()
        const leadIds = Array.from(selectedLeads)

        try {
            // Actualizar cada lead individualmente
            const updates = leadIds.map(leadId =>
                supabase
                    .from('leads')
                    .update({ archived: archive })
                    .eq('id', leadId)
            )

            const results = await Promise.all(updates)

            // Verificar si hubo errores
            const errors = results.filter(r => r.error)

            if (errors.length > 0) {
                console.error('Error bulk archiving:', errors)
                toast.error(`Error al archivar ${errors.length} conversación(es)`)
            } else {
                toast.success(`${selectedLeads.size} conversación(es) ${archive ? 'archivada(s)' : 'desarchivada(s)'}`)
                clearSelection()
            }
        } catch (err) {
            console.error('Exception bulk archiving:', err)
            toast.error('Error inesperado')
        }
    }

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault()
        if (!input.trim()) return

        // Si hay un template pendiente seleccionado y el usuario no lo ha borrado (asumimos que quiere enviar eso)
        if (pendingTemplate) {
            await sendMessage(input, pendingTemplate.name, pendingTemplate.lang)
        } else {
            await sendMessage(input)
        }

        setInput('')
        setPendingTemplate(null)
    }

    // Mobile: show chat when lead selected, otherwise show list
    const showChatOnMobile = !!activeLeadId

    return (
        <div className="min-h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] flex border rounded-lg overflow-hidden bg-card shadow-sm">

            {/* Sidebar: Conversation List - Hidden on mobile when chat is active */}
            <div className={cn(
                "w-full md:w-80 border-r bg-muted/10 flex flex-col",
                showChatOnMobile && "hidden md:flex"
            )}>
                <div className="p-3 md:p-4 border-b space-y-2">
                    <h2 className="font-semibold text-base md:text-lg">Chat Center</h2>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar en chats y mensajes..."
                            className="pl-8 h-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Filtros */}
                <ChatFilters onFilterChange={setFilters} />

                {/* Toggle para mostrar archivados */}
                <div className="px-2 py-1 border-b">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowArchived(!showArchived)}
                        className="w-full justify-start text-xs"
                    >
                        <Archive className="mr-2 h-3 w-3" />
                        {showArchived ? 'Mostrar activos' : 'Mostrar archivados'}
                        {!showArchived && leads.filter(l => l.archived).length > 0 && (
                            <span className="ml-auto bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-[10px]">
                                {leads.filter(l => l.archived).length}
                            </span>
                        )}
                    </Button>
                </div>

                {/* Botón para activar modo de selección */}
                {!selectionMode ? (
                    <div className="px-2 py-1 border-b">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectionMode(true)}
                            className="w-full justify-start text-xs"
                        >
                            <Check className="mr-2 h-3 w-3" />
                            Seleccionar
                        </Button>
                    </div>
                ) : (
                    <div className="px-2 py-2 border-b bg-accent/30 flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={selectAll}
                            className="flex-1 text-xs h-8"
                        >
                            Todos ({filteredLeads.length})
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={clearSelection}
                            className="flex-1 text-xs h-8"
                        >
                            <X className="mr-1 h-3 w-3" />
                            Cancelar
                        </Button>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto scroll-smooth-ios scrollbar-hide">
                    {loadingLeads ? (
                        <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
                    ) : filteredLeads.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">No se encontraron chats.</div>
                    ) : (
                        <div className="divide-y">
                            {filteredLeads.map(lead => (
                                <div
                                    key={lead.id}
                                    className={cn(
                                        "w-full text-left p-3 hover:bg-accent/50 transition-colors flex gap-3 relative group",
                                        activeLeadId === lead.id && "bg-accent/70"
                                    )}
                                >
                                    {/* Unread/New Indicator */}
                                    {!selectionMode && lead.unread_count > 0 && (
                                        <span className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-green-500 shadow-sm animate-pulse" />
                                    )}

                                    {/* Checkbox para selección múltiple */}
                                    {selectionMode && (
                                        <div className="flex items-center pl-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedLeads.has(lead.id)}
                                                onChange={() => toggleSelection(lead.id)}
                                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    )}

                                    {/* Main clickable area */}
                                    <button
                                        onClick={() => !selectionMode && setActiveLeadId(lead.id)}
                                        className="flex gap-3 flex-1 min-w-0"
                                    >
                                        <LeadAvatar
                                            fullName={lead.full_name || undefined}
                                            waId={lead.wa_id}
                                            active={activeLeadId === lead.id}
                                            size="md"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <span className={cn(
                                                    "truncate text-sm",
                                                    lead.unread_count > 0 ? "font-bold text-foreground" : "font-medium"
                                                )}>
                                                    {lead.full_name || lead.wa_id}
                                                </span>
                                                <span className={cn(
                                                    "text-[10px] flex-shrink-0 ml-2",
                                                    lead.unread_count > 0 ? "text-green-600 font-bold" : "text-muted-foreground"
                                                )}>
                                                    {lead.last_interaction && format(parseISO(lead.last_interaction), 'HH:mm')}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center gap-2">
                                                <LastMessagePreview
                                                    leadId={lead.id}
                                                    className={cn(
                                                        "text-xs truncate flex-1",
                                                        lead.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                                                    )}
                                                />
                                                {lead.unread_count > 0 && (
                                                    <span className="ml-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center">
                                                        {lead.unread_count}
                                                    </span>
                                                )}
                                            </div>
                                            {/* Tags */}
                                            <LeadTagsDisplay key={`tags-${lead.id}`} leadId={lead.id} />
                                        </div>
                                    </button>

                                    {/* Context Menu - Solo visible si NO está en modo selección */}
                                    {!selectionMode && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-accent rounded transition-opacity">
                                                    <MoreVertical className="h-4 w-4" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    onClick={async (e) => {
                                                        e.stopPropagation()
                                                        await markAsRead(lead.id, lead.unread_count > 0 ? 0 : 1)
                                                    }}
                                                >
                                                    {lead.unread_count > 0 ? (
                                                        <><CheckCheck className="mr-2 h-4 w-4" /> Marcar como leído</>
                                                    ) : (
                                                        <><Check className="mr-2 h-4 w-4" /> Marcar como no leído</>
                                                    )}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={async (e) => {
                                                        e.stopPropagation()
                                                        await toggleArchive(lead.id, lead.archived)
                                                    }}
                                                >
                                                    <Archive className="mr-2 h-4 w-4" /> {lead.archived ? 'Desarchivar' : 'Archivar'}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Barra flotante de acciones en lote */}
                {selectionMode && selectedLeads.size > 0 && (
                    <div className="p-3 border-t bg-background shadow-lg">
                        <div className="text-xs text-muted-foreground mb-2 text-center">
                            {selectedLeads.size} seleccionado(s)
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => bulkArchive(!showArchived)}
                                className="flex-1"
                            >
                                <Archive className="mr-2 h-4 w-4" />
                                {showArchived ? 'Desarchivar' : 'Archivar'}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Chat Area - Full screen on mobile when active */}
            <div className={cn(
                "flex-1 flex flex-col bg-background",
                !showChatOnMobile && "hidden md:flex"
            )}>
                {activeLead ? (
                    <>
                        {/* Chat Header */}
                        <div className="h-14 md:h-16 border-b flex items-center justify-between px-3 md:px-6 bg-card flex-shrink-0">
                            <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                                {/* Back button - Mobile only */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="md:hidden flex-shrink-0"
                                    onClick={() => setActiveLeadId(null)}
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>

                                <LeadAvatar
                                    fullName={activeLead.full_name || undefined}
                                    waId={activeLead.wa_id}
                                    active={true}
                                    size="md"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-sm md:text-base truncate">{activeLead.full_name || 'Usuario WhatsApp'}</h3>
                                        {/* Bot Status Badge */}
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 flex-shrink-0",
                                            activeLead.bot_active
                                                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                                : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                        )}>
                                            {activeLead.bot_active ? (
                                                <><Bot className="h-3 w-3" /> Bot</>
                                            ) : (
                                                <><User className="h-3 w-3" /> Humano</>
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Phone className="h-3 w-3 flex-shrink-0" />
                                            <span>{activeLead.wa_id}</span>
                                            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-secondary text-[10px] flex-shrink-0">{activeLead.status}</span>
                                        </p>
                                        {/* Tags */}
                                        <LeadTagManager leadId={activeLead.id} compact />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Bot Toggle Button */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleBot(activeLead.id)}
                                    className="hidden md:flex items-center gap-1.5 h-8"
                                >
                                    {activeLead.bot_active ? (
                                        <><User className="h-3.5 w-3.5" /> Desactivar Bot</>
                                    ) : (
                                        <><Bot className="h-3.5 w-3.5" /> Activar Bot</>
                                    )}
                                </Button>
                                <Button variant="ghost" size="icon" className="flex-shrink-0">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto scroll-smooth-ios p-3 md:p-6 space-y-3 md:space-y-4 bg-muted/5">
                            {loadingMessages ? (
                                <div className="flex justify-center pt-10"><Loader2 className="animate-spin text-muted-foreground" /></div>
                            ) : messages.length === 0 ? (
                                <div className="text-center text-sm text-muted-foreground pt-20">
                                    Esta conversación está vacía. ¡Saluda a tu cliente!
                                </div>
                            ) : (
                                messages.map((msg) => {
                                    const isOutbound = msg.direction === 'outbound'
                                    const hasImage = msg.media_url && msg.type === 'image'
                                    const hasAudio = msg.media_url && msg.type === 'audio'

                                    // Use proxy for WhatsApp images
                                    const imageUrl = hasImage && msg.media_url
                                        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/whatsapp-media-proxy?url=${encodeURIComponent(msg.media_url)}`
                                        : null

                                    // For audio: use proxy only for WhatsApp URLs (inbound), direct URL for Supabase (outbound)
                                    let audioUrl = null
                                    if (hasAudio && msg.media_url) {
                                        // Check if it's a Supabase Storage URL (outbound audio)
                                        if (msg.media_url.includes('supabase.co/storage')) {
                                            audioUrl = msg.media_url // Direct URL for Supabase Storage
                                        } else {
                                            // WhatsApp URL (inbound audio) - use proxy
                                            audioUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/whatsapp-media-proxy?url=${encodeURIComponent(msg.media_url)}`
                                        }
                                    }

                                    return (
                                        <div key={msg.id} className={cn("flex", isOutbound ? "justify-end" : "justify-start")}>
                                            <div className={cn(
                                                "max-w-[70%] md:max-w-[70%] rounded-2xl px-3 md:px-4 py-2 text-sm shadow-sm",
                                                isOutbound
                                                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                                                    : "bg-white border rounded-tl-sm"
                                            )}>
                                                {imageUrl && (
                                                    <div className="mb-2">
                                                        <img
                                                            src={imageUrl}
                                                            alt={msg.caption || 'Imagen'}
                                                            className="rounded-lg max-w-full h-auto"
                                                            loading="lazy"
                                                        />
                                                    </div>
                                                )}
                                                {audioUrl && (
                                                    <div className="mb-2 min-w-[250px]">
                                                        <audio
                                                            controls
                                                            className="w-full h-10 rounded-lg"
                                                            preload="metadata"
                                                            style={{
                                                                filter: isOutbound ? 'invert(1) hue-rotate(180deg)' : 'none',
                                                                maxWidth: '300px'
                                                            }}
                                                        >
                                                            <source src={audioUrl} type="audio/ogg; codecs=opus" />
                                                            <source src={audioUrl} type="audio/ogg" />
                                                            <source src={audioUrl} type="audio/mpeg" />
                                                            <source src={audioUrl} type="audio/webm" />
                                                            Tu navegador no soporta audio.
                                                        </audio>
                                                    </div>
                                                )}
                                                {(msg.content || msg.caption) && !hasAudio && (
                                                    <p className="whitespace-pre-wrap break-words">{msg.content || msg.caption}</p>
                                                )}
                                                <span className={cn(
                                                    "text-[10px] block text-right mt-1",
                                                    isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"
                                                )}>
                                                    {format(parseISO(msg.created_at), 'HH:mm')}
                                                    {isOutbound && (
                                                        <span className={cn(
                                                            "ml-1 font-bold",
                                                            msg.status === 'read' ? "text-blue-300" : "opacity-70"
                                                        )}>
                                                            {msg.status === 'sent' ? '✓' : '✓✓'}
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area - Sticky at bottom */}
                        <div className="flex-shrink-0 p-3 md:p-4 border-t bg-card">
                            <form onSubmit={handleSend} className="flex flex-col gap-2">
                                {/* Multimedia buttons row */}
                                <div className="flex items-center gap-2">
                                    <MediaUploadButton
                                        onImageSelect={(file, caption) => sendImageMessage(file, caption)}
                                    />
                                    <AudioRecorder
                                        onRecordingComplete={(blob) => sendAudioMessage(blob)}
                                    />
                                    <TemplateSelector
                                        onSelect={(content, templateInfo) => {
                                            setInput(content)
                                            if (templateInfo?.whatsapp_name) {
                                                setPendingTemplate({
                                                    name: templateInfo.whatsapp_name,
                                                    lang: templateInfo.whatsapp_language || 'es'
                                                })
                                            } else {
                                                setPendingTemplate(null)
                                            }
                                        }}
                                        leadName={activeLead?.full_name || undefined}
                                    />
                                </div>

                                {/* Text input row */}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => {
                                            setInput(e.target.value)
                                            // Si el usuario edita, limpiamos el template oficial para evitar enviar contenido incorrecto
                                            setPendingTemplate(null)
                                        }}
                                        placeholder="Escribe un mensaje..."
                                        className="flex-1 px-3 py-3 text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    <Button
                                        type="submit"
                                        disabled={!input.trim()}
                                        className="w-12 h-12 flex-shrink-0 p-0"
                                    >
                                        <Send className="h-5 w-5" />
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-4">
                        <MessageSquare className="h-12 w-12 md:h-16 md:w-16 mb-4 opacity-20" />
                        <p className="text-base md:text-lg font-medium text-center">Chat Center Lyon Visión</p>
                        <p className="text-sm text-center">Selecciona una conversación para comenzar</p>
                    </div>
                )}
            </div>
        </div>
    )
}
