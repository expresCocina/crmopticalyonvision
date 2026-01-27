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

        // Generic optimistic update could go here, but we rely on realtime for now
        const { error } = await supabase.from('messages').insert({
            lead_id: activeLeadId,
            content: content,
            direction: 'outbound',
            type: 'text',
            status: 'sent'
        })

        if (error) {
            toast.error("No se pudo enviar el mensaje")
            console.error(error)
        } else {
            // Update lead last_interaction manually or rely on trigger? 
            // We have triggers? No, usually message insert should trigger lead update.
            // Let's do it manually to be safe and fast.
            await supabase.from('leads').update({
                last_interaction: new Date().toISOString(),
                // Optional: status update if needed (e.g. stop bot)
            }).eq('id', activeLeadId)
        }
    }

    // 4. Set Active Lead & Mark as Read (Pipeline Move)
    const setActiveLeadId = async (id: string | null) => {
        setActiveLeadIdState(id)
        if (!id) return

        const lead = leads.find(l => l.id === id)
        if (lead && lead.status === 'nuevo') {
            // Move from 'nuevo' to 'interesado' (or 'contactado' if we had it) to clear the notification
            // 'interesado' implies we are looking at it.
            const { error } = await supabase
                .from('leads')
                .update({ status: 'interesado' })
                .eq('id', id)

            if (error) console.error('Error updating lead status:', error)
            // No need for manual state update as Realtime subscription will handle it
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
