'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Lead, Message } from '@/types/database'
import { toast } from 'sonner'

export function useChat() {
    const [leads, setLeads] = useState<Lead[]>([])
    const [activeLeadId, setActiveLeadIdState] = useState<string | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [loadingLeads, setLoadingLeads] = useState(true)
    const [loadingMessages, setLoadingMessages] = useState(false)
    const supabase = createClient()

    // 1. Fetch Leads (Conversations)
    useEffect(() => {
        const fetchLeads = async () => {
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .order('last_interaction', { ascending: false })

            if (error) {
                console.error('Error loading chats:', error)
            } else {
                setLeads(data || [])
            }
            setLoadingLeads(false)
        }

        fetchLeads()

        // Subscribe to new leads or status updates
        const channel = supabase.channel('chat_leads')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setLeads(prev => [payload.new as Lead, ...prev])
                } else if (payload.eventType === 'UPDATE') {
                    setLeads(prev => {
                        const updated = prev.map(l => l.id === payload.new.id ? payload.new as Lead : l)
                        // Re-sort by last_interaction
                        return updated.sort((a, b) => new Date(b.last_interaction).getTime() - new Date(a.last_interaction).getTime())
                    })
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase])

    // 2. Fetch Messages for Active Lead
    useEffect(() => {
        if (!activeLeadId) {
            setMessages([])
            return
        }

        const fetchMessages = async () => {
            setLoadingMessages(true)
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('lead_id', activeLeadId)
                .order('created_at', { ascending: true })

            if (error) toast.error("Error cargando mensajes")
            else setMessages(data || [])
            setLoadingMessages(false)
        }

        fetchMessages()

        // Subscribe to new messages for this lead
        const channel = supabase.channel(`chat_messages:${activeLeadId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `lead_id=eq.${activeLeadId}` }, (payload) => {
                setMessages(prev => [...prev, payload.new as Message])
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [activeLeadId, supabase])

    // 3. Send Message Function
    const sendMessage = async (content: string) => {
        if (!activeLeadId || !content.trim()) return

        try {
            // Call the whatsapp-outbound Edge Function to send the message
            const { data, error } = await supabase.functions.invoke('whatsapp-outbound', {
                body: {
                    lead_id: activeLeadId,
                    message: content
                }
            })

            if (error) {
                console.error('Error calling whatsapp-outbound:', error)
                toast.error("No se pudo enviar el mensaje a WhatsApp")
                return
            }

            if (!data?.success) {
                console.error('WhatsApp send failed:', data)
                toast.error("Error al enviar mensaje a WhatsApp")
                return
            }

            // Success - the Edge Function handles database insert and WhatsApp API call



        } catch (err) {
            console.error('Exception sending message:', err)
            toast.error("Error inesperado al enviar mensaje")
        }
    }

    // 4. Set Active Lead & Mark as Read (Pipeline Move)
    const setActiveLeadId = async (id: string | null) => {
        setActiveLeadIdState(id)
        if (!id) return

        const lead = leads.find(l => l.id === id)
        if (lead) {
            // Reset unread count to 0
            const { error } = await supabase
                .from('leads')
                .update({ unread_count: 0 })
                .eq('id', id)

            if (error) console.error('Error updating lead unread count:', error)

            // Optimistic update for UI responsiveness
            setLeads(prev => prev.map(l => l.id === id ? { ...l, unread_count: 0 } : l))
        }
    }

    return {
        leads,
        activeLeadId,
        setActiveLeadId,
        messages,
        loadingLeads,
        loadingMessages,
        sendMessage
    }
}
