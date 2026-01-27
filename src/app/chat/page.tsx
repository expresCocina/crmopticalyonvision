'use client'

import { useState, useEffect, useRef } from 'react'
import { useChat } from '@/hooks/useChat'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Send, Search, Phone, MoreVertical, User, MessageSquare, ArrowLeft } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export default function ChatPage() {
    const {
        leads,
        activeLeadId,
        setActiveLeadId,
        messages,
        loadingLeads,
        loadingMessages,
        sendMessage
    } = useChat()

    const [input, setInput] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Scroll to bottom on new message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const activeLead = leads.find(l => l.id === activeLeadId)

    const filteredLeads = leads.filter(l =>
        (l.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        l.wa_id.includes(searchTerm)
    )

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault()
        if (!input.trim()) return
        await sendMessage(input)
        setInput('')
    }

    // Mobile: show chat when lead selected, otherwise show list
    const showChatOnMobile = !!activeLeadId

    return (
        <div className="h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] flex border rounded-lg overflow-hidden bg-card shadow-sm">

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
                            placeholder="Buscar chat..."
                            className="pl-8 h-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loadingLeads ? (
                        <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
                    ) : filteredLeads.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">No se encontraron chats.</div>
                    ) : (
                        <div className="divide-y">
                            {filteredLeads.map(lead => (
                                <button
                                    key={lead.id}
                                    onClick={() => setActiveLeadId(lead.id)}
                                    className={cn(
                                        "w-full text-left p-3 md:p-4 hover:bg-muted/50 transition-colors flex gap-3 min-h-[60px] relative",
                                        activeLeadId === lead.id && "bg-muted shadow-inner"
                                    )}
                                >
                                    {/* Unread/New Indicator */}
                                    {lead.status === 'nuevo' && (
                                        <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-green-500" />
                                    )}

                                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                        <User className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <span className={cn(
                                                "truncate text-sm",
                                                lead.status === 'nuevo' ? "font-bold text-foreground" : "font-medium"
                                            )}>
                                                {lead.full_name || lead.wa_id}
                                            </span>
                                            <span className={cn(
                                                "text-[10px] flex-shrink-0 ml-2",
                                                lead.status === 'nuevo' ? "text-green-600 font-bold" : "text-muted-foreground"
                                            )}>
                                                {lead.last_interaction && format(parseISO(lead.last_interaction), 'HH:mm')}
                                            </span>
                                        </div>
                                        <p className={cn(
                                            "text-xs truncate",
                                            lead.status === 'nuevo' ? "text-foreground font-medium" : "text-muted-foreground"
                                        )}>
                                            {lead.status === 'nuevo' ? '✨ Nuevo Mensaje' :
                                                lead.status === 'agendado' ? '📅 Agendado' :
                                                    lead.wa_id}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Chat Area - Full screen on mobile when active */}
            <div className={cn(
                "flex-1 flex flex-col bg-background",
                !showChatOnMobile && "hidden md:flex"
            )}>
                {activeLead ? (
                    <>
                        {/* Chat Header */}
                        <div className="h-14 md:h-16 border-b flex items-center justify-between px-3 md:px-6 bg-card">
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

                                <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                    <User className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-sm md:text-base truncate">{activeLead.full_name || 'Usuario WhatsApp'}</h3>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                                        <Phone className="h-3 w-3 flex-shrink-0" />
                                        <span className="truncate">{activeLead.wa_id}</span>
                                        <span className="ml-2 px-1.5 py-0.5 rounded-full bg-secondary text-[10px] flex-shrink-0">{activeLead.status}</span>
                                    </p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="flex-shrink-0">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 p-3 md:p-6 overflow-y-auto space-y-3 md:space-y-4 bg-muted/5">
                            {loadingMessages ? (
                                <div className="flex justify-center pt-10"><Loader2 className="animate-spin text-muted-foreground" /></div>
                            ) : messages.length === 0 ? (
                                <div className="text-center text-sm text-muted-foreground pt-20">
                                    Esta conversación está vacía. ¡Saluda a tu cliente!
                                </div>
                            ) : (
                                messages.map((msg) => {
                                    const isOutbound = msg.direction === 'outbound'
                                    return (
                                        <div key={msg.id} className={cn("flex", isOutbound ? "justify-end" : "justify-start")}>
                                            <div className={cn(
                                                "max-w-[85%] md:max-w-[70%] rounded-2xl px-3 md:px-4 py-2 text-sm shadow-sm",
                                                isOutbound
                                                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                                                    : "bg-white border rounded-tl-sm"
                                            )}>
                                                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                                <span className={cn(
                                                    "text-[10px] block text-right mt-1",
                                                    isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"
                                                )}>
                                                    {format(parseISO(msg.created_at), 'HH:mm')}
                                                    {isOutbound && (
                                                        <span className="ml-1">{msg.status === 'read' ? '✓✓' : '✓'}</span>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area - Sticky bottom with safe area */}
                        <div className="p-3 md:p-4 border-t bg-card sticky bottom-0">
                            <form onSubmit={handleSend} className="flex gap-2">
                                <Input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Escribe un mensaje..."
                                    className="flex-1 min-h-[44px]"
                                />
                                <Button type="submit" disabled={!input.trim()} className="min-w-[44px] min-h-[44px]">
                                    <Send className="h-4 w-4" />
                                </Button>
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
