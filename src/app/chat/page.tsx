'use client'

import { useState, useEffect, useRef } from 'react'
import { useChat } from '@/hooks/useChat'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Send, Search, Phone, MoreVertical, User, MessageSquare } from 'lucide-react'
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

    return (
        <div className="h-[calc(100vh-8rem)] flex border rounded-lg overflow-hidden bg-card shadow-sm">

            {/* Sidebar: Conversation List */}
            <div className="w-80 border-r bg-muted/10 flex flex-col">
                <div className="p-4 border-b space-y-2">
                    <h2 className="font-semibold text-lg">Chat Center</h2>
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
                                        "w-full text-left p-4 hover:bg-muted/50 transition-colors flex gap-3",
                                        activeLeadId === lead.id && "bg-muted shadow-inner"
                                    )}
                                >
                                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                        <User className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <span className="font-medium truncate text-sm">{lead.full_name || lead.wa_id}</span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {lead.last_interaction && format(parseISO(lead.last_interaction), 'HH:mm')}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {lead.status === 'nuevo' ? '✨ Nuevo Lead' :
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

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-background">
                {activeLead ? (
                    <>
                        {/* Chat Header */}
                        <div className="h-16 border-b flex items-center justify-between px-6 bg-card">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                                    <User className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">{activeLead.full_name || 'Usuario WhatsApp'}</h3>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Phone className="h-3 w-3" /> {activeLead.wa_id}
                                        <span className="ml-2 px-1.5 py-0.5 rounded-full bg-secondary text-[10px]">{activeLead.status}</span>
                                    </p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-muted/5">
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
                                                "max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-sm",
                                                isOutbound
                                                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                                                    : "bg-white border rounded-tl-sm"
                                            )}>
                                                <p className="whitespace-pre-wrap">{msg.content}</p>
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

                        {/* Input Area */}
                        <div className="p-4 border-t bg-card">
                            <form onSubmit={handleSend} className="flex gap-2">
                                <Input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Escribe un mensaje..."
                                    className="flex-1"
                                />
                                <Button type="submit" disabled={!input.trim()}>
                                    <Send className="h-4 w-4" />
                                </Button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                        <MessageSquare className="h-16 w-16 mb-4 opacity-20" />
                        <p className="text-lg font-medium">Chat Center Lyon Visión</p>
                        <p className="text-sm">Selecciona una conversación para comenzar</p>
                    </div>
                )}
            </div>
        </div>
    )
}
